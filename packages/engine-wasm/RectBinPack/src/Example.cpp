#include <array>
#include <ctime>
#include <iostream>
#include <random>
#include <RectBinPack/MaxRects.hpp>

const unsigned int numRects = 20;
const unsigned int size = 25;

inline unsigned int getSize(unsigned int randValue) {
	return randValue % 3 + 4;
}

struct CustomRect {
	unsigned int x, y, w, h;
	bool unpacked;
};

// Conversion function from CustomRect to Rect
inline RectBinPack::Rect toRect(const CustomRect& value) {
	return {value.x, value.y, value.w, value.h};
}

// Conversion function from BinRect to CustomRect
inline void fromBinRect(CustomRect& value, RectBinPack::BinRect rect) {
	value.x = rect.rect.x;
	value.y = rect.rect.y;
	value.w = rect.rect.width;
	value.h = rect.rect.height;

	// If bin is not set, set rectangle to unpacked
	value.unpacked = rect.bin == RectBinPack::InvalidBin;
}

int main() {
	auto seed = (unsigned int) std::time(nullptr);
	std::minstd_rand rand(seed);
	
	std::vector<CustomRect> data;
	data.reserve(numRects);

	// Append rectangles to vector with random sizes
	for (unsigned int i = 0; i < numRects; ++i)
		data.push_back({ 0, 0, getSize(rand()), getSize(rand()), true });

	// Initialize configuration (size x size, 1 bin, no flipping, BestAreaFit)
	RectBinPack::MaxRectsConfiguration config {
		size, size, 1, 1, false, RectBinPack::MaxRectsHeuristic::BestAreaFit
	};

	// Pack rectangles
	const auto result = RectBinPack::packMaxRects(config, data);

	if (result.failed)
		std::cout << "Warning: not all rectangles were packed" << std::endl;

	// Output rectangles to console
	char map[size][size];

	for (unsigned int i = 0; i < size; ++i)
		for (unsigned int j = 0; j < size; ++j)
			map[j][i] = ' ';

	for (auto& rect : data) {
		if (rect.unpacked)
			continue;

		for (unsigned int i = 1; i < rect.w - 1; ++i) map[rect.y][rect.x + i] = '-';
		for (unsigned int i = 1; i < rect.w - 1; ++i) map[rect.y + rect.h - 1][rect.x + i] = '-';

		for (unsigned int i = 1; i < rect.h - 1; ++i) map[rect.y + i][rect.x] = '|';
		for (unsigned int i = 1; i < rect.h - 1; ++i) map[rect.y + i][rect.x + rect.w - 1] = '|';

		map[rect.y][rect.x] = '+';
		map[rect.y][rect.x + rect.w - 1] = '+';
		map[rect.y + rect.h - 1][rect.x] = '+';
		map[rect.y + rect.h - 1][rect.x + rect.w - 1] = '+';
	}

	for (unsigned int j = 0; j < size; ++j) {
		for (unsigned int i = 0; i < size; ++i)
			std::cout << map[j][i];

		std::cout << std::endl;
	}

	return 0;
}
