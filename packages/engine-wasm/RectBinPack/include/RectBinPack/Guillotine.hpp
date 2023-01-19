/**
 * \file Guillotine.hpp
 * Implementation of the %Guillotine algorithm
 */

#pragma once

#include "RectBinPack.hpp"

#include <algorithm>
#include <vector>

namespace RectBinPack {
	/**
	 * \addtogroup Guillotine
	 * @{
	 */

	/// Heuristic for determining the best free space to put the rectangle into
	enum class GuillotineRectHeuristic {
		BestAreaFit,       ///< Use rect where the least space is left
		BestShortSideFit,  ///< Use rect with the lowest shortest width or height of the remaining space
		BestLongSideFit,   ///< Use rect with the lowest longest width or height of the remaining space
		WorstAreaFit,      ///< Use rect where the most space is left
		WorstShortSideFit, ///< Use rect with the highest shortest width or height of the remaining space
		WorstLongSideFit   ///< Use rect with the highest longest width or height of the remaining space
	};

	/// Heuristic for determining the best axis to split the used free space
	enum class GuillotineSplitHeuristic {
		ShorterLeftoverAxis, ///< Split rect by the shorter leftover axis
		LongerLeftoverAxis,  ///< Split rect by the longer leftover axis
		MinimizeArea,        ///< Split rect by the axis where the least area is left
		MaximizeArea,        ///< Split rect by the axis where the most area is left
		ShorterAxis,         ///< Split rect by the shorter axis
		LongerAxis           ///< Split rect by the longer axis
	};

	/// Configuration for the packing function
	struct GuillotineConfiguration {
		unsigned int width; ///< Width of the bin
		unsigned int height; ///< Height of the bin
		int minBins; ///< Minimum number of bins. Defaults to 1 if less then 1
		int maxBins; ///< Maximum number of bins. Defaults to UnlimitedBins if less than 1
		bool canFlip; ///< Allows for flipping of the rectangles
		bool merge; ///< Enables merging. Free spaces that can be represented by a bigger one are merged.
		GuillotineRectHeuristic rectHeuristic; ///< Heuristic to use for finding a free space
		GuillotineSplitHeuristic splitHeuristic; ///< Heuristic to use for splitting the free space
	};

	/// \cond INTERNAL
	namespace Internal {
		/// Implementation of the %Guillotine algorithm
		template<typename It>
		class Guillotine {
		public:
			/// Type of the iterator's value
			using Type = typename std::iterator_traits<It>::value_type;

			/**
			 * \brief Constructs the class and creates vector of iterators
			 *
			 * Empty rectangles are always set to InvalidBin
			 *
			 * \param begin Begin iterator of the sequence
			 * \param end End iterator of the sequence
			 * \param size Size of the sequence. Helps the internal vector determine the size, can be set to 0
			 * \param config Configuration to use for packing
			 * \throws RectangleTooLargeError if the rectangle is too big to fit into any bin
			 */
			template<typename ItEnd>
			Guillotine(It begin, ItEnd end, std::size_t size, const GuillotineConfiguration& config):
				m_config(config) {

				m_rects.reserve(size);

				for (auto it = begin; it != end; ++it) {
					const auto rect = toRect(*it);

					if (rect.width > config.width || rect.height > config.height)
						if (!config.canFlip || (rect.height > config.width || rect.width > config.height))
							throw RectangleTooLargeError("rectangle is too large");
			
					if (rect.width > 0 && rect.height > 0)
						m_rects.push_back(it);
					else
						fromBinRect(*it, { { 0, 0, 0, 0 }, InvalidBin, false });
				}
			}

			/**
			 * \brief Packs the rectangles
			 *
			 * \returns true, if packing succeeded
			 */
			bool pack() {
				m_bins = std::vector<Bin> {
					(unsigned int) std::max(1, m_config.minBins),
					Bin { std::vector<Rect> { Rect { 0, 0, m_config.width, m_config.height } } }
				};

				while (!m_rects.empty()) {
					FindResult findResult;

					if (!findBest(findResult)) {
						if (m_config.maxBins > 0 && m_bins.size() >= (unsigned int) m_config.maxBins) {
							for (auto& rect : m_rects)
								fromBinRect(*rect, {
									toRect(*rect),
									InvalidBin,
									false
								});
							
							return false;
						}

						for (auto& bin : m_bins)
							bin.freeRects.clear();

						m_bins.push_back({ std::vector<Rect> { Rect { 0, 0, m_config.width, m_config.height } } });
						continue;
					}

					const auto binIndex = std::distance(m_bins.begin(), findResult.bin);
					const auto& occupiedRect = findResult.occupiedRect;

					fromBinRect(**findResult.rect, {
						occupiedRect,
						(unsigned int) binIndex,
						findResult.flip
					});

					auto& freeRect = findResult.freeRect;
					auto& bin = findResult.bin;

					// Split free rectangle
					if (occupiedRect.width != freeRect->width || occupiedRect.height != freeRect->height) {
						if (occupiedRect.width == freeRect->width) {
							freeRect->y += occupiedRect.height;
							freeRect->height -= occupiedRect.height;
						}
						else if (occupiedRect.height == freeRect->height) {
							freeRect->x += occupiedRect.width;
							freeRect->width -= occupiedRect.width;
						}
						else {
							Rect bottom, right;

							split(*freeRect, occupiedRect.width, occupiedRect.height, bottom, right);
							
							*freeRect = bottom;
							bin->freeRects.push_back(right);
						}

						if (m_config.merge)
							merge(bin->freeRects);
					}
					else
						swapAndPop(bin->freeRects, freeRect);

					// Remove rect
					swapAndPop(m_rects, findResult.rect);
				}

				return true;
			}

			/// Returns the number of bins used
			unsigned int numBins() const {
				return m_bins.size();
			}

		private:
			struct Bin {
				std::vector<Rect> freeRects;
			};

			using RectIt = typename std::vector<It>::iterator;
			using BinIt = typename std::vector<Bin>::iterator;
			using FreeRectIt = typename std::vector<Rect>::iterator;

			struct FindResult {
				RectIt rect;
				Rect occupiedRect;
				BinIt bin;
				FreeRectIt freeRect;
				bool flip;
			};

			unsigned int getScore(const Rect& freeRect, unsigned int w, unsigned int h) {
				switch (m_config.rectHeuristic) {
				case GuillotineRectHeuristic::BestShortSideFit:
					return std::min(freeRect.width - w, freeRect.height - h);
				case GuillotineRectHeuristic::BestLongSideFit:
					return std::max(freeRect.width - w, freeRect.height - h);
				case GuillotineRectHeuristic::WorstAreaFit:
					// Bitwise not has the same effect as -value
					// TODO: Take advantage of overflow
					return ~(freeRect.width * freeRect.height - w * h);
				case GuillotineRectHeuristic::WorstShortSideFit:
					// Bitwise not has the same effect as -value
					return ~std::min(freeRect.width - w, freeRect.height - h);
				case GuillotineRectHeuristic::WorstLongSideFit:
					// Bitwise not has the same effect as -value
					return ~std::max(freeRect.width - w, freeRect.height - h);
				default: // Use BestAreaFit as default
					return freeRect.width * freeRect.height - w * h;
				}
			}

			void split(const Rect& freeRect, unsigned int width, unsigned int height, Rect& outBottom, Rect& outRight) {
				const auto wdiff = freeRect.width - width;
				const auto hdiff = freeRect.height - height;

				auto splitHor = false;

				switch (m_config.splitHeuristic) {
				case GuillotineSplitHeuristic::ShorterLeftoverAxis:
					splitHor = wdiff <= hdiff;
					break;
				case GuillotineSplitHeuristic::LongerLeftoverAxis:
					splitHor = wdiff > hdiff;
					break;
				case GuillotineSplitHeuristic::MinimizeArea:
					splitHor = width * hdiff > wdiff * height;
					break;
				case GuillotineSplitHeuristic::ShorterAxis:
					splitHor = freeRect.width <= freeRect.height;
					break;
				case GuillotineSplitHeuristic::LongerAxis:
					splitHor = freeRect.width > freeRect.height;
					break;
				default: // Use MaximizeArea as default
					splitHor = width * hdiff <= wdiff * height;
					break;
				}

				outBottom = { freeRect.x, freeRect.y + height, splitHor ? freeRect.width : width, freeRect.height - height };
				outRight = { freeRect.x + width, freeRect.y, freeRect.width - width, splitHor ? height : freeRect.height };
			}

			bool findBest(FindResult& result) {
				const auto invalidScore = std::numeric_limits<unsigned int>::max();
				auto bestScore = invalidScore;

				for (auto binIt = m_bins.begin(); binIt != m_bins.end(); ++binIt) {
					auto& bin = *binIt;

					for (auto freeRectIt = bin.freeRects.begin(); freeRectIt != bin.freeRects.end(); ++freeRectIt) {
						auto& freeRect = *freeRectIt;

						for (auto rectIt = m_rects.begin(); rectIt != m_rects.end(); ++rectIt) {
							const auto rect = toRect(**rectIt);

							// Check if rect fits perfectly in freeRect
							if (rect.width == freeRect.width && rect.height == freeRect.height) {
								result = { rectIt, freeRect, binIt, freeRectIt, false };
								return true;
							}

							if (m_config.canFlip && rect.height == freeRect.width && rect.width == freeRect.height) {
								result = { rectIt, freeRect, binIt, freeRectIt, true };
								return true;
							}

							// Otherwise calculate score
							if (rect.width <= freeRect.width && rect.height <= freeRect.height) {
								const auto score = getScore(freeRect, rect.width, rect.height);

								if (score < bestScore) {
									result = { rectIt, {}, binIt, freeRectIt, false };
									bestScore = score;
								}
							}

							if (m_config.canFlip && rect.height <= freeRect.width && rect.width <= freeRect.height) {
								const auto score = getScore(freeRect, rect.height, rect.width);

								if (score < bestScore) {
									result = { rectIt, {}, binIt, freeRectIt, true };
									bestScore = score;
								}
							}
						}
					}
				}

				if (bestScore != invalidScore) {
					const auto rect = toRect(**result.rect);

					const Rect occupiedRect {
						result.freeRect->x,
						result.freeRect->y,
						rect.width,
						rect.height
					};

					result.occupiedRect = result.flip ? occupiedRect.flipped() : occupiedRect;
				}

				return bestScore != invalidScore;
			}

			void merge(std::vector<Rect>& freeRects) {
				for (auto i = freeRects.begin(); i != freeRects.end(); ++i) {
					for (auto j = std::next(i); j != freeRects.end(); ++j) {
						if (i->x == j->x && i->width == j->width) {
							if (i->bottom() == j->y) {
								i->height += j->height;
								swapAndPop(freeRects, j--);
							}
							else if (j->bottom() == i->y) {
								i->y -= j->height;
								i->height += j->height;
								swapAndPop(freeRects, j--);
							}
						}
						else if (i->y == j->y && i->height == j->height) {
							if (i->right() == j->x) {
								i->width += j->width;
								swapAndPop(freeRects, j--);
							}
							else if (j->right() == i->x) {
								i->x -= j->width;
								i->width += j->width;
								swapAndPop(freeRects, j--);
							}
						}
					}
				}
			}

			const GuillotineConfiguration& m_config;
			std::vector<It> m_rects;
			std::vector<Bin> m_bins;
		};
	}
	/// \endcond

	/**
	 * \brief Packs rectangles using the %Guillotine algorithm
	 *
	 * The conversion to and from the rectangles uses functions to transform them into and from the internal types.
	 * They are called toRect and fromBinRect. They have to be overloaded for each custom type. The index of empty
	 * rectangles is always set to InvalidBin.
	 *
	 * \param config Configuration to use for packing
	 * \param begin Begin iterator of the sequence of rectangles
	 * \param end End iterator of the sequence of rectangles
	 * \param size Size of the sequence. Helps the internal vector reserve enough space, can be set to 0
	 * \returns If the packing suceeded and the number of used bins
	 * \throws std::runtime_error if the rectangle is too big to fit into any bin
	 */
	template<typename It, typename ItEnd>
	Result packGuillotine(const GuillotineConfiguration& config, It begin, ItEnd end, std::size_t size = 0) {
		Internal::Guillotine<It> guillotine(begin, end, size, config);
		return { !guillotine.pack(), guillotine.numBins() };
	}

	/**
	 * \brief Packs rectangles using the %Guillotine algorithm
	 *
	 * The conversion to and from the rectangles uses functions to transform them into and from the internal types.
	 * They are called toRect and fromBinRect. They have to be overloaded for each custom type. The index of empty
	 * rectangles is always set to InvalidBin.
	 *
	 * \param config Configuration to use for packing
	 * \param collection Collection of rectangles e.g. vector, list, array
	 * \returns If the packing suceeded and the number of used bins
	 * \throws std::runtime_error if the rectangle is too big to fit into any bin
	 */
	template<typename Collection>
	Result packGuillotine(const GuillotineConfiguration& config, Collection& collection) {
		return packGuillotine(config, std::begin(collection), std::end(collection), Internal::size(collection));
	}

	/**
	 * @}
	 */
}
