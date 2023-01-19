#define CATCH_CONFIG_MAIN
#include <catch.hpp>

#include <RectBinPack/RectBinPack.hpp>
#include <RectBinPack/Guillotine.hpp>
#include <RectBinPack/MaxRects.hpp>
#include <random>

using namespace RectBinPack;

static std::vector<BinRect> prepareVector(unsigned int seed, unsigned int initialBin = 0) {
	std::minstd_rand rand(seed);
	std::vector<BinRect> rects;

	for (auto i = 0u; i < 20; ++i)
		rects.push_back({
			{ 0, 0, (unsigned int) (rand() % 20), (unsigned int) (rand() % 20) },
			initialBin, false
		});

	return rects;
}

static void validateRects(Result result, const std::vector<BinRect>& rects, unsigned int width, unsigned int height) {
	if (!result.failed)
		CHECK(!std::any_of(rects.begin(), rects.end(), [](const BinRect& rect) {
			return rect.bin == InvalidBin && rect.rect.width != 0 && rect.rect.height != 0;
		}));
	
	CHECK(!std::any_of(rects.begin(), rects.end(), [&](const BinRect& rect) {
		return rect.bin != InvalidBin && rect.bin >= result.numBins;
	}));

	CHECK(!std::any_of(rects.begin(), rects.end(), [&](const BinRect& rect) {
		return rect.rect.right() > width || rect.rect.bottom() > height;
	}));

	for (auto i = 0u; i < rects.size(); ++i) {
		if (rects[i].bin == InvalidBin)
			continue;

		for (auto j = i + 1; j < rects.size(); ++j) {
			if (rects[i].bin != rects[j].bin)
				continue;

			REQUIRE(!rects[i].rect.intersect(rects[j].rect));
		}
	}
}

static void testGuillotine(GuillotineRectHeuristic rectHeuristic, GuillotineSplitHeuristic splitHeuristic, bool merge, unsigned int seed) {
	auto rects = prepareVector(seed);

	GuillotineConfiguration config {
		100, 100, 1, UnlimitedBins, true, merge, rectHeuristic, splitHeuristic
	};

	validateRects(packGuillotine(config, rects), rects, 100, 100);
}

static void testGuillotineRectSplitHeuristic(GuillotineRectHeuristic rectHeuristic, GuillotineSplitHeuristic splitHeuristic, unsigned int seed) {
	testGuillotine(rectHeuristic, splitHeuristic, false, seed);
	testGuillotine(rectHeuristic, splitHeuristic, true, seed);
}

static void testGuillotineRectHeuristic(GuillotineRectHeuristic rectHeuristic, unsigned int seed) {
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::ShorterLeftoverAxis, seed);
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::LongerLeftoverAxis, seed);
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::MinimizeArea, seed);
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::MaximizeArea, seed);
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::ShorterAxis, seed);
	testGuillotineRectSplitHeuristic(rectHeuristic, GuillotineSplitHeuristic::LongerAxis, seed);
}

static void testMaxRects(MaxRectsHeuristic heuristic, unsigned int seed) {
	auto rects = prepareVector(seed);

	MaxRectsConfiguration config {
		45, 45, 1, UnlimitedBins, true, heuristic
	};

	validateRects(packMaxRects(config, rects), rects, 45, 45);
}

TEST_CASE("Coordinates", "[Rect]") {
	Rect rect { 10, 20, 30, 40 };

	CHECK(rect.left() == 10);
	CHECK(rect.right() == 40);
	CHECK(rect.top() == 20);
	CHECK(rect.bottom() == 60);
}

TEST_CASE("Is Contained In", "[Rect]") {
	Rect a { 10, 20, 50, 50 };
	Rect b { 20, 30, 10, 20 };
	Rect c { 120, 30, 10, 20 };
	Rect d { 20, 30, 100, 20 };

	CHECK(a.isContainedIn(a));
	CHECK(b.isContainedIn(a));
	CHECK_FALSE(a.isContainedIn(b));
	CHECK_FALSE(c.isContainedIn(a));
	CHECK_FALSE(a.isContainedIn(c));
	CHECK_FALSE(d.isContainedIn(a));
	CHECK_FALSE(a.isContainedIn(d));
}

TEST_CASE("Intersect", "[Rect]") {
	Rect a { 10, 20, 50, 50 };
	Rect b { 20, 30, 10, 20 };
	Rect c { 70, 30, 10, 30 };

	CHECK(a.intersect(a));
	CHECK(a.intersect(b));
	CHECK(b.intersect(a));
	CHECK_FALSE(a.intersect(c));
	CHECK_FALSE(c.intersect(a));
}

TEST_CASE("Flipped", "[Rect]") {
	Rect rect { 10, 20, 30, 40 };

	CHECK(rect.flipped().width == rect.height);
	CHECK(rect.flipped().height == rect.width);
}

TEST_CASE("Equality Operator", "[Rect]") {
	Rect a { 10, 20, 30, 40 };
	Rect b { 11, 21, 31, 41 };

	CHECK(a == a);
	CHECK_FALSE(a == b);
}

TEST_CASE("Vector Erase", "[Internal]") {
	std::vector<int> vec { 1, 2, 3, 4 };

	Internal::swapAndPop(vec, vec.begin() + 3);
	int a[] = { 1, 2, 3 };
	REQUIRE(std::equal(vec.begin(), vec.end(), a));

	Internal::swapAndPop(vec, vec.begin());
	int b[] = { 3, 2 };
	REQUIRE(std::equal(vec.begin(), vec.end(), b));

	Internal::swapAndPop(vec, vec.begin());
	int c[] = { 2 };
	REQUIRE(std::equal(vec.begin(), vec.end(), c));

	Internal::swapAndPop(vec, vec.begin());
	REQUIRE(vec.empty());
}

TEST_CASE("To Rect", "[BinRect Conversion]") {
	BinRect rect { { 1, 2, 3, 4 }, 0, false };

	CHECK(toRect(rect).x == 1);
	CHECK(toRect(rect).y == 2);
	CHECK(toRect(rect).width == 3);
	CHECK(toRect(rect).height == 4);
}

TEST_CASE("From BinRect", "[BinRect Conversion]") {
	BinRect rect;

	fromBinRect(rect, { { 1, 2, 3, 4 }, 5, true });

	CHECK(rect.rect.x == 1);
	CHECK(rect.rect.y == 2);
	CHECK(rect.rect.width == 3);
	CHECK(rect.rect.height == 4);
	CHECK(rect.bin == 5);
	CHECK(rect.flipped);
}

TEST_CASE("Guillotine", "[Guillotine]") {
	const auto seed = 0u;

	for (auto i = 0u; i < 25; ++i) {
		testGuillotineRectHeuristic(GuillotineRectHeuristic::BestAreaFit, seed + i);
		testGuillotineRectHeuristic(GuillotineRectHeuristic::BestShortSideFit, seed + i);
		testGuillotineRectHeuristic(GuillotineRectHeuristic::BestLongSideFit, seed + i);
		testGuillotineRectHeuristic(GuillotineRectHeuristic::WorstAreaFit, seed + i);
		testGuillotineRectHeuristic(GuillotineRectHeuristic::WorstShortSideFit, seed + i);
		testGuillotineRectHeuristic(GuillotineRectHeuristic::WorstLongSideFit, seed + i);
	}
}

TEST_CASE("MaxRects", "[MaxRects]") {
	const auto seed = 0u;

	for (auto i = 0u; i < 25; ++i) {
		testMaxRects(MaxRectsHeuristic::BestShortSideFit, seed + i);
		testMaxRects(MaxRectsHeuristic::BestLongSideFit, seed + i);
		testMaxRects(MaxRectsHeuristic::BestAreaFit, seed + i);
		testMaxRects(MaxRectsHeuristic::BottomLeftRule, seed + i);
		testMaxRects(MaxRectsHeuristic::ContactPointRule, seed + i);
	}
}

TEST_CASE("Guillotine Too Big Exception", "[Guillotine]") {
	GuillotineConfiguration config { 10, 20, 1, UnlimitedBins, false, true, GuillotineRectHeuristic::BestAreaFit, GuillotineSplitHeuristic::MaximizeArea };
	std::vector<BinRect> rects { { { 0, 0, 15, 10 }, InvalidBin, false } };

	CHECK_THROWS(packGuillotine(config, rects));
	config.canFlip = true;
	CHECK_NOTHROW(packGuillotine(config, rects));
}

TEST_CASE("MaxRects Too Big Exception", "[MaxRects]") {
	MaxRectsConfiguration config { 10, 20, 1, UnlimitedBins, false, MaxRectsHeuristic::BestAreaFit };
	std::vector<BinRect> rects { { { 0, 0, 15, 10 }, InvalidBin, false } };

	CHECK_THROWS(packMaxRects(config, rects));
	config.canFlip = true;
	CHECK_NOTHROW(packMaxRects(config, rects));
}

TEST_CASE("Guillotine Failed", "[Guillotine]") {
	const auto seed = 0u;
	auto rects = prepareVector(seed, 10);

	GuillotineConfiguration config { 20, 20, 1, 1, false, true, GuillotineRectHeuristic::BestAreaFit, GuillotineSplitHeuristic::MaximizeArea };
	REQUIRE(packGuillotine(config, rects).failed);

	CHECK(!std::any_of(rects.begin(), rects.end(), [](const BinRect& rect) {
		return rect.bin != 0 && rect.bin != InvalidBin;
	}));
}

TEST_CASE("MaxRects Failed", "[MaxRects]") {
	const auto seed = 0u;
	auto rects = prepareVector(seed, 10);

	MaxRectsConfiguration config { 20, 20, 1, 1, false, MaxRectsHeuristic::BestAreaFit };
	REQUIRE(packMaxRects(config, rects).failed);

	CHECK(!std::any_of(rects.begin(), rects.end(), [](const BinRect& rect) {
		return rect.bin != 0 && rect.bin != InvalidBin;
	}));
}
