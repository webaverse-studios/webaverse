[![Build status](https://ci.appveyor.com/api/projects/status/wog6f0mocvqysgta/branch/master?svg=true)](https://ci.appveyor.com/project/FlorianPreinfalk/rectbinpack/branch/master) [![Build Status](https://travis-ci.org/falki147/RectBinPack.svg?branch=master)](https://travis-ci.org/falki147/RectBinPack) [![codecov](https://codecov.io/gh/falki147/RectBinPack/branch/master/graph/badge.svg)](https://codecov.io/gh/falki147/RectBinPack)

Rectangle Bin Packing Library
=============================
This library provides algorithms on how to pack rectangles into several bins. It currently contains the MaxRects and Guillotine algorithms. The project is based on the [survey](http://clb.demon.fi/files/RectangleBinPack.pdf) of [Jukka Jylänki](https://github.com/juj) and the [reference implementation](https://github.com/juj/RectangleBinPack) Possible applications are e.g. Texture Atlas Generators.

Features
--------
* C++ 11 support
* Header only
* Custom types

Example
-------
Full example can be found in `src/Example.cpp`

```C++
struct CustomRect { ... };

// Conversion function from CustomRect to Rect
inline RectBinPack::Rect toRect(const CustomRect& value) { ... }

// Conversion function from BinRect to CustomRect
inline void fromBinRect(CustomRect& value, RectBinPack::BinRect rect) { ... }

std::vector<CustomRect> data { ... };

// Initialize configuration (size x size, 1 bin, no flipping, BestAreaFit)
RectBinPack::MaxRectsConfiguration config {
	size, size, 1, 1, false, RectBinPack::MaxRectsHeuristic::BestAreaFit
};

// Pack rectangles
RectBinPack::packMaxRects(config, data);
```

Installation
------------
Just copy and paste the include folder into your project, add it to your include path or install it with CMake.

Usage
-----
See `src/Example.cpp` or [Doxygen](https://www.preinfalk.co.at/projects/RectBinPack/index.html)
