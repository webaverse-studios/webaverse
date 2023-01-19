/**
 * \file MaxRects.hpp
 * Implementation of the %MaxRects algorithm
 */

#pragma once

#include "RectBinPack.hpp"

#include <algorithm>
#include <vector>

namespace RectBinPack {
	/**
	 * \addtogroup MaxRects
	 * @{
	 */

	/// Heuristic for determining the best free space to put the rectangle into
	enum class MaxRectsHeuristic {
		BestShortSideFit, ///< Use rect with the lowest shortest width or height of the remaining space
		BestLongSideFit,  ///< Use rect with the lowest longest width or height of the remaining space
		BestAreaFit,      ///< Use rect where the least space is left
		BottomLeftRule,   ///< Use the most bottom left rectangle
		ContactPointRule  ///< Use rect where the most sides are shared
	};

	/// Configuration for the packing function
	struct MaxRectsConfiguration {
		unsigned int width; ///< Width of the bin
		unsigned int height; ///< Height of the bin
		int minBins; ///< Minimum number of bins. Defaults to 1 if less then 1
		int maxBins; ///< Maximum number of bins. Defaults to UnlimitedBins if less than 1
		bool canFlip; ///< Allows for flipping of the rectangles
		MaxRectsHeuristic rectHeuristic; ///< Heuristic to use
	};

	/// \cond INTERNAL
	namespace Internal {
		/// Implementation of the %MaxRects algorithm
		template<typename It>
		class MaxRects {
		public:
			/// Type of the iterator's value
			using Type = typename std::iterator_traits<It>::value_type;

			/**
			 * \brief Constructs the class and creates vector of iterators
			 *
			 * \param begin Begin iterator of the sequence
			 * \param end End iterator of the sequence
			 * \param size Size of the sequence. Helps the internal vector determine the size, can be set to 0
			 * \param config Configuration to use for packing
			 * \throws RectangleTooLargeError if the rectangle is too big to fit into any bin
			 */
			template<typename ItEnd>
			MaxRects(It begin, ItEnd end, std::size_t size, const MaxRectsConfiguration& config):
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
					Bin { std::vector<Rect> { Rect { 0, 0, m_config.width, m_config.height } }, {} }
				};

				while (!m_rects.empty()) {
					FindResult findResult;

					// If it couldn't find a free spot, add bin
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

						m_bins.push_back({ std::vector<Rect> { Rect { 0, 0, m_config.width, m_config.height } }, {} });
						continue;
					}

					const auto binIndex = (unsigned int) std::distance(m_bins.begin(), findResult.bin);
					const auto& occupiedRect = findResult.occupiedRect;

					fromBinRect(**findResult.rect, {
						occupiedRect,
						binIndex,
						findResult.flip
					});

					auto& bin = *findResult.bin;
					auto& freeRects = bin.freeRects;
					const auto freeRectsSize = freeRects.size();

					// Split rectangles and "remove" old ones
					for (auto i = 0u; i < freeRectsSize; ++i) {
						if (!occupiedRect.intersect(freeRects[i]))
							continue;

						if (occupiedRect.left() < freeRects[i].right() && occupiedRect.right() > freeRects[i].left()) {
							if (occupiedRect.top() > freeRects[i].top() && occupiedRect.top() < freeRects[i].bottom())
								freeRects.push_back({ freeRects[i].left(), freeRects[i].top(), freeRects[i].width, occupiedRect.top() - freeRects[i].top() });

							if (occupiedRect.bottom() < freeRects[i].bottom())
								freeRects.push_back({ freeRects[i].left(), occupiedRect.bottom(), freeRects[i].width, freeRects[i].bottom() - occupiedRect.bottom() });
						}

						if (occupiedRect.top() < freeRects[i].bottom() && occupiedRect.bottom() > freeRects[i].top()) {
							if (occupiedRect.left() > freeRects[i].left() && occupiedRect.left() < freeRects[i].right())
								freeRects.push_back({ freeRects[i].left(), freeRects[i].top(), occupiedRect.left() - freeRects[i].left(), freeRects[i].height });

							if (occupiedRect.right() < freeRects[i].right())
								freeRects.push_back({ occupiedRect.right(), freeRects[i].top(), freeRects[i].right() - occupiedRect.right(), freeRects[i].height });
						}

						freeRects[i] = {};
					}

					// Remove empty rects
					freeRects.erase(std::remove(freeRects.begin(), freeRects.end(), Rect {}), freeRects.end());

					// Remove if inside another rectangle
					for (auto i = freeRects.begin(); i != freeRects.end();) {
						auto redo = false;

						for (auto j = std::next(i); j != freeRects.end(); ++j) {
							if (i->isContainedIn(*j)) {
								swapAndPop(freeRects, i);
								redo = true;
								break;
							}
							else if (j->isContainedIn(*i)) {
								swapAndPop(freeRects, j--);
								continue;
							}
						}

						if (!redo)
							++i;
					}

					// Add rect to used vector
					if (m_config.rectHeuristic == MaxRectsHeuristic::ContactPointRule)
						bin.usedRects.push_back(occupiedRect);

					// Remove rect
					m_rects.erase(findResult.rect);
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
				std::vector<Rect> usedRects;
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

			void getScore(const Rect& dest, unsigned int w, unsigned int h, unsigned int& score1, unsigned int& score2) {
				switch (m_config.rectHeuristic) {
				case MaxRectsHeuristic::BestShortSideFit:
					score1 = std::min(dest.width - w, dest.height - h);
					score2 = std::max(dest.width - w, dest.height - h);
					break;
				case MaxRectsHeuristic::BestLongSideFit:
					score1 = std::max(dest.width - w, dest.height - h);
					score2 = std::min(dest.width - w, dest.height - h);
					break;
				case MaxRectsHeuristic::BottomLeftRule:
					score1 = dest.y + h;
					score2 = dest.x;
					break;
				default: // Use BestAreaFit as default
					score1 = dest.width * dest.height - w * h;
					score2 = std::min(dest.width - w, dest.height - h);
					break;
				}
			}

			unsigned int getScoreContactPoint(const std::vector<Rect>& usedRects, Rect rect) {
				auto score = 0u;

				if (rect.left() == 0 || rect.right() == m_config.width)
					score += rect.width;

				if (rect.top() == 0 || rect.bottom() == m_config.height)
					score += rect.height;

				for (auto& other : usedRects) {
					if (other.left() == rect.right() || other.right() == rect.left())
						score += std::min(other.bottom(), rect.bottom()) - std::max(other.top(), rect.top());

					if (other.top() == rect.bottom() || other.bottom() == rect.top())
						score += std::min(other.right(), rect.right()) - std::max(other.left(), rect.left());
				}

				return score;
			}

			bool findBest(FindResult& result) {
				const auto invalidScore = std::numeric_limits<unsigned int>::max();

				auto bestScore1 = invalidScore;
				auto bestScore2 = invalidScore;

				for (auto binIt = m_bins.begin(); binIt != m_bins.end(); ++binIt) {
					auto& bin = *binIt;

					for (auto freeRectIt = bin.freeRects.begin(); freeRectIt != bin.freeRects.end(); ++freeRectIt) {
						auto& freeRect = *freeRectIt;

						for (auto rectIt = m_rects.begin(); rectIt != m_rects.end(); ++rectIt) {
							const auto rect = toRect(**rectIt);

							if (rect.width <= freeRect.width && rect.height <= freeRect.height) {
								unsigned int score1, score2 = invalidScore;

								if (m_config.rectHeuristic == MaxRectsHeuristic::ContactPointRule)
									score1 = getScoreContactPoint(bin.usedRects, {
										freeRect.x, freeRect.y, rect.width, rect.height
									});
								else
									getScore(freeRect, rect.width, rect.height, score1, score2);

								if (score1 < bestScore1 || (score1 == bestScore1 && score2 < bestScore2)) {
									result = { rectIt, {}, binIt, freeRectIt, false };
									bestScore1 = score1;
									bestScore2 = score2;
								}
							}

							if (m_config.canFlip && rect.height <= freeRect.width && rect.width <= freeRect.height) {
								unsigned int score1, score2 = invalidScore;

								if (m_config.rectHeuristic == MaxRectsHeuristic::ContactPointRule)
									score1 = getScoreContactPoint(bin.usedRects, {
										freeRect.x, freeRect.y, rect.height, rect.width
									});
								else
									getScore(freeRect, rect.height, rect.width, score1, score2);

								if (score1 < bestScore1 || (score1 == bestScore1 && score2 < bestScore2)) {
									result = { rectIt, {}, binIt, freeRectIt, true };
									bestScore1 = score1;
									bestScore2 = score2;
								}
							}
						}
					}
				}

				if (bestScore1 != invalidScore) {
					const auto rect = toRect(**result.rect);

					const Rect occupiedRect {
						result.freeRect->x,
						result.freeRect->y,
						rect.width,
						rect.height
					};

					result.occupiedRect = result.flip ? occupiedRect.flipped() : occupiedRect;
				}

				return bestScore1 != invalidScore;
			}

			const MaxRectsConfiguration& m_config;
			std::vector<It> m_rects;
			std::vector<Bin> m_bins;
		};
	}
	/// \endcond

	/**
	 * \brief Packs rectangles using the %MaxRects algorithm
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
	Result packMaxRects(const MaxRectsConfiguration& config, It begin, ItEnd end, std::size_t size = 0) {
		Internal::MaxRects<It> maxRects(begin, end, size, config);
		return { !maxRects.pack(), maxRects.numBins() };
	}

	/**
	 * \brief Packs rectangles using the %MaxRects algorithm
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
	Result packMaxRects(const MaxRectsConfiguration& config, Collection& collection) {
		return packMaxRects(config, std::begin(collection), std::end(collection), Internal::size(collection));
	}

	/**
	 * @}
	 */
}
