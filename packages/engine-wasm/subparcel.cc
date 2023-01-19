#include "subparcel.h"
#include "collide.h"
#include <pthread.h>
#include <iostream>

int absi(int n) {
  return std::abs(n);
}
int sign(int n) {
  return n < 0 ? 1 : 0;
}
int getSubparcelIndex(int x, int y, int z) {
  return absi(x)|(absi(y)<<9)|(absi(z)<<18)|(sign(x)<<27)|(sign(y)<<28)|(sign(z)<<29);
}
unsigned int getFieldIndex(unsigned int x, unsigned int y, unsigned int z) {
  return x + (z * SUBPARCEL_SIZE_P1) + (y * SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1);
}

void Semaphore::release() {
  std::lock_guard<decltype(mutex_)> lock(mutex_);
  ++count_;
  condition_.notify_one();
}
void Semaphore::acquire() {
  std::unique_lock<decltype(mutex_)> lock(mutex_);
  while(!count_) // Handle spurious wake-ups.
    condition_.wait(lock);
  --count_;
}
bool Semaphore::try_acquire() {
  std::lock_guard<decltype(mutex_)> lock(mutex_);
  if(count_) {
    --count_;
    return true;
  }
  return false;
}

FreeEntry::FreeEntry(const FreeEntrySpec &spec, ArenaAllocator *arenaAllocator) : spec(spec), arenaAllocator(arenaAllocator) {}
FreeEntry::~FreeEntry() {
  arenaAllocator->freeSpec(spec);
}

ArenaAllocator::ArenaAllocator(unsigned int size) {
  data = (unsigned char *)malloc(size);
  freeList.push_back(FreeEntrySpec{
    0,
    size,
  });
}
std::shared_ptr<FreeEntry> ArenaAllocator::alloc(unsigned int size) {
  std::lock_guard<std::mutex> lock(mutex);

  for (unsigned int i = 0; i < freeList.size(); i++) {
    FreeEntrySpec entry = freeList[i];
    if (entry.count >= size) {
      if (entry.count > size) {
        freeList[i] = FreeEntrySpec{
          entry.start + size,
          entry.count - size,
        };
      } else {
        freeList.erase(freeList.begin() + i);
      }
      entry.count = size;
      return std::shared_ptr<FreeEntry>(new FreeEntry(entry, this));
    }
  }
  std::cout << "arena alloc failed" << std::endl;
  abort();
  return std::shared_ptr<FreeEntry>();
}
void ArenaAllocator::freeSpec(const FreeEntrySpec &spec) {
  std::lock_guard<std::mutex> lock(mutex);

  freeList.push_back(spec);
  updateFreeList();
}
void ArenaAllocator::updateFreeList() {
  std::sort(freeList.begin(), freeList.end(), [](FreeEntrySpec &a, FreeEntrySpec &b) -> bool {
    return a.start < b.start;
  });
  bool merged = false;
  for (unsigned int i = 0; i < freeList.size()-1; i++) {
    FreeEntrySpec &entry = freeList[i];
    if (entry.count > 0) {
      for (unsigned int j = i+1; j < freeList.size(); j++) {
        FreeEntrySpec &nextEntry = freeList[j];
        if (nextEntry.count > 0) {
          if (entry.start + entry.count == nextEntry.start) {
            entry.count += nextEntry.count;
            nextEntry.count = 0;

            merged = true;
          }
        }
      }
    }
  }
  if (merged) {
		std::vector<FreeEntrySpec> freeList2;
		freeList2.reserve(freeList.size());
		std::copy_if(freeList.begin(), freeList.end(), std::back_inserter(freeList2), [](FreeEntrySpec &freeEntry) -> bool {
      return freeEntry.count > 0;
		});
		freeList = std::move(freeList2);
  }
}

// ThreadPool * volatile gThreadPool = nullptr;
ThreadPool::ThreadPool(unsigned int numThreads) {
  // gThreadPool = this;
  
  // std::cout << "cons thread pool " << (void *)this << " " << (void *)gThreadPool << std::endl;
  
  for (unsigned int i = 0; i < numThreads; i++) {
    // std::cout << "starting thread " << i << std::endl;
    pthread_t pthread;
    // pthread_attr_t attr;
    // pthread_attr_init(&attr);
    // pthread_attr_setstacksize(&attr, 10*1024*1024);
    pthread_create(&pthread, nullptr/*&attr*/, ThreadPool::runFn, this);
  }
}
void *ThreadPool::runFn(void *arg) {
  ThreadPool *threadPool = (ThreadPool *)arg;
  // std::cout << "thread pool inner" << std::endl;
  // ThreadPool::runFn();
  
  if (!threadPool) {
    abort();
  }
  
  // std::cout << "thread pool running" << std::endl;
  for (;;) {
    Message message = threadPool->inbox.wait();
    // std::cout << "got request message method a " << (int)message.method << std::endl;
    auto &fn = METHOD_FNS[message.method];
    fn(threadPool, message);
    // std::cout << "got request message method b" << std::endl;
  }
  return nullptr;
}

Tracker::Tracker(
	int seed,
  unsigned int meshId,
  int chunkDistance,

  ArenaAllocator *landPositionsAllocator,
  ArenaAllocator *landNormalsAllocator,
  ArenaAllocator *landUvsAllocator,
  // ArenaAllocator *landBarycentricsAllocator,
  ArenaAllocator *landAosAllocator,
  ArenaAllocator *landIdsAllocator,
  ArenaAllocator *landSkyLightsAllocator,
  ArenaAllocator *landTorchLightsAllocator,

  ArenaAllocator *vegetationPositionsAllocator,
  ArenaAllocator *vegetationUvsAllocator,
  ArenaAllocator *vegetationIdsAllocator,
  ArenaAllocator *vegetationIndicesAllocator,
  ArenaAllocator *vegetationSkyLightsAllocator,
  ArenaAllocator *vegetationTorchLightsAllocator,

  ArenaAllocator *thingPositionsAllocator,
  ArenaAllocator *thingUvsAllocator,
  ArenaAllocator *thingAtlasUvsAllocator,
  ArenaAllocator *thingIdsAllocator,
  ArenaAllocator *thingIndicesAllocator,
  ArenaAllocator *thingSkyLightsAllocator,
  ArenaAllocator *thingTorchLightsAllocator
) :
  seed(seed),
  meshId(meshId),
  chunkDistance(chunkDistance),

  lastCoord(0, 256, 0),
  updatePending(false),

  landPositionsAllocator(landPositionsAllocator),
  landNormalsAllocator(landNormalsAllocator),
  landUvsAllocator(landUvsAllocator),
  // landBarycentricsAllocator(landBarycentricsAllocator),
  landAosAllocator(landAosAllocator),
  landIdsAllocator(landIdsAllocator),
  landSkyLightsAllocator(landSkyLightsAllocator),
  landTorchLightsAllocator(landTorchLightsAllocator),

  vegetationPositionsAllocator(vegetationPositionsAllocator),
  vegetationUvsAllocator(vegetationUvsAllocator),
  vegetationIdsAllocator(vegetationIdsAllocator),
  vegetationIndicesAllocator(vegetationIndicesAllocator),
  vegetationSkyLightsAllocator(vegetationSkyLightsAllocator),
  vegetationTorchLightsAllocator(vegetationTorchLightsAllocator),

  thingPositionsAllocator(thingPositionsAllocator),
  thingUvsAllocator(thingUvsAllocator),
  thingAtlasUvsAllocator(thingAtlasUvsAllocator),
  thingIdsAllocator(thingIdsAllocator),
  thingIndicesAllocator(thingIndicesAllocator),
  thingSkyLightsAllocator(thingSkyLightsAllocator),
  thingTorchLightsAllocator(thingTorchLightsAllocator),

  atlasTexture(atlasTextureSize * atlasTextureSize * 4),
  atlasFreeList(maxAtlasTextures)
{}
NeededCoords *Tracker::updateNeededCoords(float x, float y, float z) {
  if (!updatePending) {
    Coord coord(
      (int)std::floor(x/(float)SUBPARCEL_SIZE),
      (int)std::floor(y/(float)SUBPARCEL_SIZE),
      (int)std::floor(z/(float)SUBPARCEL_SIZE)
    );

    // std::cout << "check coord " << x << " " << y << " " << z << " " << coord.x << " " << coord.y << " " << coord.z << " " << coord.index << " : " << lastCoord.x << " " << lastCoord.y << " " << lastCoord.z << " " << lastCoord.index << " " << (coord != lastCoord) << std::endl;
    if (coord != lastCoord) {
      std::vector<Coord> neededCoords;
      neededCoords.reserve(256);
      std::vector<Coord> addedCoords;
      addedCoords.reserve(256);
      for (int dx = -chunkDistance; dx <= chunkDistance; dx++) {
        const int ax = dx + coord.x;
        for (int dy = -chunkDistance; dy <= chunkDistance; dy++) {
          const int ay = dy + coord.y;
          for (int dz = -chunkDistance; dz <= chunkDistance; dz++) {
            const int az = dz + coord.z;
            Coord aCoord(ax, ay, az);
            neededCoords.push_back(aCoord);

            auto iter = std::find_if(lastNeededCoords.begin(), lastNeededCoords.end(), [&](const Coord &coord2) -> bool {
              return coord2.index == aCoord.index;
            });
            if (iter == lastNeededCoords.end()) {
            	// std::cout << "add index " << coord.x << " " << coord.y << " " << coord.z << " " << aCoord.x << " " << aCoord.y << " " << aCoord.z << " " << aCoord.index << " " << dx << " " << dy << " " << dz << std::endl;
              addedCoords.push_back(aCoord);
            }
          }
        }
      }

      std::map<int, std::shared_ptr<Subparcel>> subparcelMap;
      {
        std::lock_guard<std::mutex> lock(subparcelsMutex);

        for (const Coord &addedCoord : addedCoords) {
          std::shared_ptr<Subparcel> subparcel(new Subparcel(addedCoord, this));
          loadingSubparcels[addedCoord.index] = subparcel;
          subparcelMap[addedCoord.index] = subparcel;
        }
      }

      std::vector<Coord> removedCoords;
      removedCoords.reserve(256);
      for (const Coord &lastNeededCoord : lastNeededCoords) {
        auto iter = std::find_if(neededCoords.begin(), neededCoords.end(), [&](const Coord &coord2) -> bool {
          return coord2.index == lastNeededCoord.index;
        });
        if (iter == neededCoords.end()) {
          removedCoords.push_back(lastNeededCoord);
        }
      }
      {
        std::lock_guard<std::mutex> lock(subparcelsMutex);

        for (const Coord &removedCoord : removedCoords) {
          auto subparcelsIter = subparcels.find(removedCoord.index);
          if (subparcelsIter != subparcels.end()) {
            auto &subparcel = *subparcelsIter->second;
            subparcel.live = false;
            subparcels.erase(subparcelsIter);
          }

          auto loadingSubparcelsIter = loadingSubparcels.find(removedCoord.index);
          if (loadingSubparcelsIter != loadingSubparcels.end()) {
            auto &subparcel = *loadingSubparcelsIter->second;
            subparcel.live = false;
            loadingSubparcels.erase(loadingSubparcelsIter);
          }
        }
      }

      lastNeededCoords = std::move(neededCoords);
      lastCoord = coord;

      // if (addedCoords.size() > 0 || removedCoords.size() > 0) {
        // std::cout << "added removed coords " << addedCoords.size() << " : " << removedCoords.size() << std::endl;
      // }

      updatePending = true;

      return new NeededCoords(std::move(subparcelMap));
    } else {
      return nullptr;
    }
  } else {
    return nullptr;
  }
}
void Tracker::subparcelUpdate(ThreadPool *threadPool, GeometrySet *geometrySet, NeededCoords *neededCoords, Subparcel *subparcel, unsigned int generate) {
  std::shared_ptr<Subparcel> &subparcelSharedPtr = neededCoords->subparcelMap[subparcel->coord.index];

  Message message{};
  MessagePusher pusher(message);
  message.id = -1;
  message.method = (int)METHODS::chunk;
  message.priority = 0;

  {
    pusher.push(seed);
    pusher.push(this);
    pusher.push(geometrySet);
    pusher.push(new std::weak_ptr<Subparcel>(subparcelSharedPtr));
    pusher.push(generate);
  }

  threadPool->inbox.queue(message);
}
void Tracker::finishUpdate(NeededCoords *neededCoords) {
  delete neededCoords;
  updatePending = false;
}

Object::Object() : id(0) {}
Object::Object(const Object &object) {
  id = object.id;
  type = object.type;
  memcpy(name, object.name, sizeof(name));
  position = object.position;
  quaternion = object.quaternion;
}
Object &Object::operator=(const Object &object) {
  id = object.id;
  type = object.type;
  memcpy(name, object.name, sizeof(name));
  position = object.position;
  quaternion = object.quaternion;
  return *this;
}

Subparcel::Subparcel(const Coord &coord, Tracker *tracker) :
  coord(coord),
  numObjects(0),
  numThings(0),
  tracker(tracker),
  boundingSphere(
    Vec{(float)coord.x*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f, (float)coord.y*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f, (float)coord.z*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f},
    slabRadius
  ),
  live(true),

  landPhysxObject(nullptr)
{}
Subparcel::~Subparcel() {}
Subparcel *Subparcel::clone() const {
  Subparcel *subparcel = new Subparcel(coord, tracker);

  memcpy(subparcel->potentials, potentials, sizeof(potentials));
  memcpy(subparcel->biomes, biomes, sizeof(biomes));
  memcpy(subparcel->heightfield, heightfield, sizeof(heightfield));
  memcpy(subparcel->lightfield, lightfield, sizeof(lightfield));
  subparcel->numObjects = numObjects;
  memcpy(subparcel->objects, objects, sizeof(objects));
  subparcel->numThings = numThings;
  memcpy(subparcel->things, things, sizeof(things));

  return subparcel;
}
void Subparcel::copyLand(const Subparcel &subparcel) {
  memcpy(peeks, subparcel.peeks, sizeof(peeks));

  landPositionsEntry = subparcel.landPositionsEntry;
  landNormalsEntry = subparcel.landNormalsEntry;
  landUvsEntry = subparcel.landUvsEntry;
  // landBarycentricsEntry = subparcel.landBarycentricsEntry;
  landAosEntry = subparcel.landAosEntry;
  landIdsEntry = subparcel.landIdsEntry;
  landSkyLightsEntry = subparcel.landSkyLightsEntry;
  landTorchLightsEntry = subparcel.landTorchLightsEntry;

  landPhysxObject = subparcel.landPhysxObject;
  memcpy(landGroups, subparcel.landGroups, sizeof(landGroups));
}
void Subparcel::copyVegetation(const Subparcel &subparcel) {
  vegetationPositionsEntry = subparcel.vegetationPositionsEntry;
  vegetationUvsEntry = subparcel.vegetationUvsEntry;
  vegetationIdsEntry = subparcel.vegetationIdsEntry;
  vegetationIndicesEntry = subparcel.vegetationIndicesEntry;
  vegetationSkyLightsEntry = subparcel.vegetationSkyLightsEntry;
  vegetationTorchLightsEntry = subparcel.vegetationTorchLightsEntry;
  
  memcpy(vegetationGroups, subparcel.vegetationGroups, sizeof(vegetationGroups));
  vegetationPhysxObjects = subparcel.vegetationPhysxObjects;
}
void Subparcel::getArenaSpec(SubparcelArenaSpec *arenaSpec) const {
  arenaSpec->landPositions = &landPositionsEntry->spec;
  arenaSpec->landNormals = &landNormalsEntry->spec;
  arenaSpec->landUvs = &landUvsEntry->spec;
  arenaSpec->landAos = &landAosEntry->spec;
  arenaSpec->landIds = &landIdsEntry->spec;
  arenaSpec->landSkyLights = &landSkyLightsEntry->spec;
  arenaSpec->landTorchLights = &landTorchLightsEntry->spec;

  arenaSpec->vegetationPositions = &vegetationPositionsEntry->spec;
  arenaSpec->vegetationUvs = &vegetationUvsEntry->spec;
  arenaSpec->vegetationIds = &vegetationIdsEntry->spec;
  arenaSpec->vegetationIndices = &vegetationIndicesEntry->spec;
  arenaSpec->vegetationSkyLights = &vegetationSkyLightsEntry->spec;
  arenaSpec->vegetationTorchLights = &vegetationTorchLightsEntry->spec;

  arenaSpec->thingPositions = &thingPositionsEntry->spec;
  arenaSpec->thingUvs = &thingUvsEntry->spec;
  arenaSpec->thingAtlasUvs = &thingAtlasUvsEntry->spec;
  arenaSpec->thingIds = &thingIdsEntry->spec;
  arenaSpec->thingIndices = &thingIndicesEntry->spec;
  arenaSpec->thingSkyLights = &thingSkyLightsEntry->spec;
  arenaSpec->thingTorchLights = &thingTorchLightsEntry->spec;
}