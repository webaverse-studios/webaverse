/**
 * \file RectBinPack.hpp
 * Defines common types and functions
 */

#pragma once

#include <limits>
#include <stdexcept>

namespace RectBinPack {
	/// Exception thrown by packing function when rectangle is larger then bin size
	class RectangleTooLargeError: public std::runtime_error {
	public:
		/// Construct from message string
		explicit RectangleTooLargeError(const char* msg):
			std::runtime_error(msg) { }
		
		/// Construct from message string
		explicit RectangleTooLargeError(std::string& msg):
			std::runtime_error(msg) { }
	};
	
	/// Represents a rectangle and consists of a position and a size
	struct Rect {
		/// Returns the left side of the rectangle (#x)
		unsigned int left() const {
			return x;
		}

		/// Returns the right side of the rectangle (#x + #width)
		unsigned int right() const {
			return x + width;
		}

		/// Returns the top side of the rectangle (#y)
		unsigned int top() const {
			return y;
		}

		/// Returns the bottom side of the rectangle (#y + #height)
		unsigned int bottom() const {
			return y + height;
		}

		/**
		 * \brief Checks if rectangle is inside \p other
		 * This also returns true if the two rectangles are the same
		 */
		bool isContainedIn(const Rect& other) const {
			return left() >= other.left() && top() >= other.top() &&
				right() <= other.right() && bottom() <= other.bottom();
		}

		/**
		 * \brief Checks if rectangle intersects with \p other
		 * This also returns true if the two rectangles are the same
		 */
		bool intersect(const Rect& other) const {
			return left() < other.right() && right() > other.left() &&
				top() < other.bottom() && bottom() > other.top();
		}

		/// Returns the flipped rectangle (width and height swapped)
		Rect flipped() const {
			return { x, y, height, width };
		}

		/// Checks if rectangle matches \p other
		bool operator==(const Rect& other) const {
			return x == other.x && y == other.y && width == other.width && height == other.height;
		}

		unsigned int x; ///< X position of the rectangle
		unsigned int y; ///< Y position of the rectangle
		unsigned int width; ///< Height of the rectangle
		unsigned int height; ///< Width of the rectangle
	};

	/// Contains a rectangle, bin number and a boolean for flipped rectangles
	struct BinRect {
		Rect rect; ///< Packed rectangle
		unsigned int bin; ///< Number of bin starting with 0. It can be InvalidBin.
		bool flipped; ///< Indicates if the rectangle was flipped or not.
	};

	/// Contains the result of the packing algorithm
	struct Result {
		/**
		 * \brief Indicates if the algorithm failed to pack the bin with the supplied configuration.
		 *
		 * Unpacked rectangles are set to InvalidBin. Packed rectangles stay the same.
		 */
		bool failed;

		unsigned int numBins; ///< Number of bins used for packing
	};

	/// Conversion function from CustomRect to Rect
	inline Rect toRect(const BinRect& value) {
		return value.rect;
	}

	/// Conversion function from BinRect to BinRect
	inline void fromBinRect(BinRect& dst, BinRect rect) {
		dst = rect;
	}

	/// Value used for indicating an invalid bin index
	const unsigned int InvalidBin = std::numeric_limits<unsigned int>::max();

	/// Indicates if no maximum should be used
	const int UnlimitedBins = -1;

	/// \cond INTERNAL
	namespace Internal {
		/// Swaps \p it with the back of the vector and pops its back
		template<typename T, typename It>
		void swapAndPop(T& vector, It it) {
			if (it + 1 != vector.end())
				*it = std::move(vector.back());

			vector.pop_back();
		}

		/// Returns the number of items in \p c
		template<typename C>
		auto size(const C& c) -> decltype(c.size()) {
			return c.size();
		}

		/// Returns the number of items in \p c
		template<typename T, std::size_t N>
		std::size_t size(const T(&c)[N]) {
			return N;
		}
	}
	/// \endcond
}
