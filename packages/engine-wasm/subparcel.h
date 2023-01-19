#ifndef SUBPARCEL_H
#define SUBPARCEL_H

#include "vector.h"
#include "collide.h"
#include <list>
#include <deque>
#include <map>
#include <set>
#include <thread>
#include <mutex>
#include <condition_variable>

constexpr int PARCEL_SIZE = 300;
constexpr int SUBPARCEL_SIZE = 10;
constexpr int SUBPARCEL_SIZE_P1 = SUBPARCEL_SIZE + 1;
constexpr int SUBPARCEL_SIZE_P3 = SUBPARCEL_SIZE + 3;
constexpr int PLANET_OBJECT_SLOTS = 512;
constexpr int MAX_NAME_LENGTH = 32;
constexpr float SPAWNER_RATE = 0.08;
constexpr float slabRadius = 8.660254037844387; // Math.sqrt((SUBPARCEL_SIZE/2)*(SUBPARCEL_SIZE/2)*3);

int absi(int n);
int sign(int n);
int getSubparcelIndex(int x, int y, int z);
unsigned int getFieldIndex(unsigned int x, unsigned int y, unsigned int z);

class Semaphore {
private:
  std::mutex mutex_;
  std::condition_variable condition_;
  unsigned long count_ = 0; // Initialized as locked.
public:
  void release();
  void acquire();
  bool try_acquire();
};

class ArenaAllocator;
class FreeEntrySpec {
public:
  unsigned int start;
  unsigned int count;
};
class FreeEntry {
public:
  FreeEntry(const FreeEntrySpec &spec, ArenaAllocator *arenaAllocator);
  ~FreeEntry();

  FreeEntrySpec spec;
  ArenaAllocator *arenaAllocator;
};
class ArenaAllocator {
public:
  ArenaAllocator(unsigned int size);
  std::shared_ptr<FreeEntry> alloc(unsigned int size);
protected:
  void freeSpec(const FreeEntrySpec &spec);
  void updateFreeList();

public:
  unsigned char *data;
  std::vector<FreeEntrySpec> freeList;
  std::mutex mutex;

  friend class FreeEntry;
};

constexpr unsigned int maxNumMessageArgs = 32;
class MessagePusher;
class Message {
public:
  operator bool() const {
    return id != 0;
  }
  void copyMetadata(const Message &m) {
    id = m.id;
    method = m.method;
    priority = m.priority;
  }

  int id;
  int method;
  int priority;
protected:
  unsigned char args[maxNumMessageArgs * sizeof(unsigned int)];

  friend class MessagePuller;
  friend class MessagePusher;
};
class MessagePuller {
public:
  MessagePuller(const Message &message) : message(message), offset(0) {}

  template <typename T>
  inline T pull() {
    // if (offset + sizeof(T) <= sizeof(message.args)) {
      T o;
      memcpy(&o, message.args + offset, sizeof(T));
      offset += sizeof(T);
      return std::move(o);
    /* } else {
      std::cout << "message arg pull overflow: " << offset << ":" << sizeof(T) << std::endl;
      abort();
      return T{};
    } */
  }
  template <typename T, unsigned int count>
  inline T *pull() {
    // if (offset + sizeof(T) * count <= sizeof(message.args)) {
      T *o = (T *)(message.args + offset);
      offset += sizeof(T) * count;
      return o;
    /* } else {
      std::cout << "message arg pull array overflow: " << offset << ":" << sizeof(T) << ":" << count << std::endl;
      abort();
      return nullptr;
    } */
  }
  const Message &message;
  unsigned int offset;
};
class MessagePusher {
public:
  MessagePusher(Message &message) : message(message), offset(0) {}

  template <typename T>
  inline void push(const T &o) {
    // if (offset + sizeof(T) <= sizeof(message.args)) {
      memcpy(message.args + offset, &o, sizeof(T));
      offset += sizeof(T);
    /* } else {
      std::cout << "message arg push overflow: " << offset << ":" << sizeof(T) << std::endl;
      abort();
    } */
  }
  Message &message;
  unsigned int offset;
};

template <typename M>
class Mailbox {
public:
  void queue(M &message) {
    std::lock_guard<std::mutex> lock(mutex);
    if (message.priority > 0) {
      messages.push_front(message);
    } else {
      messages.push_back(message);
    }
    semaphore.release();
  }
  void queueAll(M *ms, unsigned int numMessages) {
    // std::cout << "queue all " << (void *)ms << std::endl;
    std::lock_guard<std::mutex> lock(mutex);
    for (unsigned int i = 0; i < numMessages; i++) {
      const M &m = ms[i];
      // std::cout << "queue " << (void *)&m << " " << m.id << " " << m.method << " " << sizeof(Message) << std::endl;
      /* if (m.method > 0 && m.method < 256) {
      } else {
        std::cout << "invalid method" << std::endl;
        abort();
      } */
      if (m.priority > 0) {
        messages.push_front(m);
      } else {
        messages.push_back(m);
      }
      semaphore.release();
    }
  }
  M wait() {
    for(;;) {
      semaphore.acquire();
      std::lock_guard<std::mutex> lock(mutex);
      M message = messages.front();
      messages.pop_front();
      if (message) {
        return message;
      }
    }
  }
  void push(M &message) {
    std::lock_guard<std::mutex> lock(mutex);
    messages.push_back(message);
    // std::cout << "push messages a " << messages.size() << std::endl;
    // semaphore.release();
  }
  M pop() {
    M message{};
    {
      std::lock_guard<std::mutex> lock(mutex);
      if (messages.size() > 0) {
        message = messages.front();
        messages.pop_front();
        // semaphore.acquire();
      }
    }
    return message;
  }
  /* void popAll(std::deque<M> &ms) {
    std::lock_guard<std::mutex> lock(mutex);
    ms = std::move(messages);
  } */
  void filterQueue(std::function<bool(const Message &message)> testFn) {
    std::lock_guard<std::mutex> lock(mutex);

    std::deque<M> newMessages;
    newMessages.reserve(messages.size());
    std::copy_if(messages.begin(), messages.end(), std::back_inserter(newMessages), [](const Message &message) -> bool {
      return message.id > 0;
    });
    messages = std::move(newMessages);
  }

  std::deque<M> messages;
  Semaphore semaphore;
  std::mutex mutex;
};
template<typename M>
class DependencyMailbox {
public:
  void push(std::function<bool()> fn, M &message) {
    std::lock_guard<std::mutex> lock(mutex);

    queue.push_back(std::pair<std::function<bool()>, M>(fn, message));
  }
  M pop() {
    std::lock_guard<std::mutex> lock(mutex);

    for (auto iter = queue.begin(); iter != queue.end(); iter++) {
      std::pair<std::function<bool()>, M> &entry = *iter;
      std::function<bool()> &fn = entry.first;
      const M &message = entry.second;
      if (fn()) {
        queue.erase(iter);
        return message;
      }
    }
    return Message{};
  }

  std::list<std::pair<std::function<bool()>, M>> queue;
  std::mutex mutex;
};

class ThreadPool {
public:
  ThreadPool(unsigned int numThreads);

  static void *runFn(void *arg);

  Mailbox<Message> inbox;
  DependencyMailbox<Message> dependencyInbox;
  Mailbox<Message> outbox;
};
// extern ThreadPool * volatile gThreadPool;

enum class METHODS : int {
  makeArenaAllocator = 1,
  arenaAlloc,
  arenaFree,
  makeGeometrySet,
  loadBake,
  getGeometry,
  getGeometries,
  getGeometryKeys,
  getAnimalGeometry,
  marchObjects,
  getHeight,
  noise,
  marchingCubes,
  bakeGeometry,
  getSubparcel,
  releaseSubparcel,
  chunk,
  mine,
  releaseMine,
  light,
  addObject,
  removeObject,
  releaseAddRemoveObject,
  addThingGeometry,
  addThing,
};
enum class MESSAGES : int {
  updateSubparcel = -1,
  updateGeometry = -2,
};
extern "C" {
  extern std::function<void(ThreadPool *, const Message &)> METHOD_FNS[];
}

class Coord {
public:
  Coord() : x(0), y(0), z(0), index(getSubparcelIndex(x, y, z)) {}
  Coord(int x, int y, int z) : x(x), y(y), z(z), index(getSubparcelIndex(x, y, z)) {}
  Coord(int x, int y, int z, int index) : x(x), y(y), z(z), index(index) {}
  Coord(const Coord &coord) : x(coord.x), y(coord.y), z(coord.z), index(coord.index) {}
  bool operator<(const Coord &c) const {
    return c.index < index;
  }
  bool operator==(const Coord &c) const {
    return c.index == index;
  }
  bool operator!=(const Coord &c) const {
    return c.index != index;
  }
  Coord &operator=(const Coord &c) {
    x = c.x;
    y = c.y;
    z = c.z;
    index = c.index;
    return *this;
  }

  int x;
  int y;
  int z;
  int index;
};

constexpr unsigned int atlasTextureSize = 4096;
constexpr unsigned int objectTextureSize = 512;
constexpr unsigned int maxAtlasTextures = (atlasTextureSize * atlasTextureSize) / (objectTextureSize * objectTextureSize);
constexpr unsigned int maxAtlasTextureRowObjects = atlasTextureSize / objectTextureSize;
class GeometrySet;
class FreeEntry;
class Subparcel;
class NeededCoords;
namespace physx {
  class PxDefaultAllocator;
  class PxDefaultErrorCallback;
  class PxFoundation;
  class PxPhysics;
  class PxCooking;
}
class Tracker {
public:
  Tracker(
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
  );
  NeededCoords *updateNeededCoords(float x, float y, float z);
  void subparcelUpdate(ThreadPool *threadPool, GeometrySet *geometrySet, NeededCoords *neededCoords, Subparcel *subparcel, unsigned int generate);
  void finishUpdate(NeededCoords *neededCoords);

  int seed;
  unsigned int meshId;
  int chunkDistance;

  Coord lastCoord;
  std::vector<Coord> lastNeededCoords;
  bool updatePending;

  ArenaAllocator *landPositionsAllocator;
  ArenaAllocator *landNormalsAllocator;
  ArenaAllocator *landUvsAllocator;
  // ArenaAllocator *landBarycentricsAllocator;
  ArenaAllocator *landAosAllocator;
  ArenaAllocator *landIdsAllocator;
  ArenaAllocator *landSkyLightsAllocator;
  ArenaAllocator *landTorchLightsAllocator;

  ArenaAllocator *vegetationPositionsAllocator;
  ArenaAllocator *vegetationUvsAllocator;
  ArenaAllocator *vegetationIdsAllocator;
  ArenaAllocator *vegetationIndicesAllocator;
  ArenaAllocator *vegetationSkyLightsAllocator;
  ArenaAllocator *vegetationTorchLightsAllocator;

  ArenaAllocator *thingPositionsAllocator;
  ArenaAllocator *thingUvsAllocator;
  ArenaAllocator *thingAtlasUvsAllocator;
  ArenaAllocator *thingIdsAllocator;
  ArenaAllocator *thingIndicesAllocator;
  ArenaAllocator *thingSkyLightsAllocator;
  ArenaAllocator *thingTorchLightsAllocator;

  std::vector<unsigned char> atlasTexture;
  std::map<std::string, std::pair<float, float>> atlasTextureMap;
  std::vector<unsigned int> atlasFreeList;

  std::map<int, std::shared_ptr<Subparcel>> subparcels;
  std::map<int, std::shared_ptr<Subparcel>> loadingSubparcels;
  std::set<std::shared_ptr<Subparcel>> currentCullSubparcels;
  std::mutex subparcelsMutex;

  std::vector<std::shared_ptr<PhysicsObject>> thingPhysxObjects;

  Physicer physicer;
};

class Group {
public:
  Group() : start(0), count(0), materialIndex(0) {}

  unsigned int start;
  unsigned int count;
  unsigned int materialIndex;
};

enum class OBJECT_TYPE : int {
  VEGETATION = 1,
  PACKAGE = 2,
};
class Object {
public:
  Object();
  Object(const Object &object);
  Object &operator=(const Object &object);

  unsigned int id;
  OBJECT_TYPE type;
  char name[MAX_NAME_LENGTH];
  Vec position;
  Quat quaternion;
};

class Thing {
public:
  unsigned int id;
  char name[MAX_NAME_LENGTH];
  Vec position;
  Quat quaternion;
};

class SubparcelArenaSpec {
public:
  FreeEntrySpec *landPositions;
  FreeEntrySpec *landNormals;
  FreeEntrySpec *landUvs;
  FreeEntrySpec *landAos;
  FreeEntrySpec *landIds;
  FreeEntrySpec *landSkyLights;
  FreeEntrySpec *landTorchLights;

  FreeEntrySpec *vegetationPositions;
  FreeEntrySpec *vegetationUvs;
  FreeEntrySpec *vegetationIds;
  FreeEntrySpec *vegetationIndices;
  FreeEntrySpec *vegetationSkyLights;
  FreeEntrySpec *vegetationTorchLights;

  FreeEntrySpec *thingPositions;
  FreeEntrySpec *thingUvs;
  FreeEntrySpec *thingAtlasUvs;
  FreeEntrySpec *thingIds;
  FreeEntrySpec *thingIndices;
  FreeEntrySpec *thingSkyLights;
  FreeEntrySpec *thingTorchLights;
};

class Subparcel {
public:
  Subparcel(const Coord &coord, Tracker *tracker);
  ~Subparcel();

  bool operator<(const Subparcel &subparcel) const {
    return coord < subparcel.coord;
  }
  bool operator==(const Subparcel &subparcel) const {
    return coord == subparcel.coord;
  }
  bool operator!=(const Subparcel &subparcel) const {
    return coord != subparcel.coord;
  }
  
  Subparcel *clone() const;
  void copyLand(const Subparcel &subparcel);
  void copyVegetation(const Subparcel &subparcel);
  void getArenaSpec(SubparcelArenaSpec *arenaSpec) const;

  // data
  Coord coord;
  float potentials[SUBPARCEL_SIZE_P3 * SUBPARCEL_SIZE_P3 * SUBPARCEL_SIZE_P3];
  unsigned char biomes[SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1 + 3]; // align
  char heightfield[SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1 + 1]; // align
  unsigned char lightfield[SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1 * SUBPARCEL_SIZE_P1 + 1]; // align
  unsigned int numObjects;
  Object objects[PLANET_OBJECT_SLOTS];
  unsigned int numThings;
  Thing things[PLANET_OBJECT_SLOTS];

  // transient state
  Tracker *tracker;
  Sphere boundingSphere;

  unsigned char peeks[16];
  std::shared_ptr<FreeEntry> landPositionsEntry;
  std::shared_ptr<FreeEntry> landNormalsEntry;
  std::shared_ptr<FreeEntry> landUvsEntry;
  std::shared_ptr<FreeEntry> landAosEntry;
  std::shared_ptr<FreeEntry> landIdsEntry;
  std::shared_ptr<FreeEntry> landSkyLightsEntry;
  std::shared_ptr<FreeEntry> landTorchLightsEntry;

  std::shared_ptr<FreeEntry> vegetationPositionsEntry;
  std::shared_ptr<FreeEntry> vegetationUvsEntry;
  std::shared_ptr<FreeEntry> vegetationIdsEntry;
  std::shared_ptr<FreeEntry> vegetationIndicesEntry;
  std::shared_ptr<FreeEntry> vegetationSkyLightsEntry;
  std::shared_ptr<FreeEntry> vegetationTorchLightsEntry;

  std::shared_ptr<FreeEntry> thingPositionsEntry;
  std::shared_ptr<FreeEntry> thingUvsEntry;
  std::shared_ptr<FreeEntry> thingAtlasUvsEntry;
  std::shared_ptr<FreeEntry> thingIdsEntry;
  std::shared_ptr<FreeEntry> thingIndicesEntry;
  std::shared_ptr<FreeEntry> thingSkyLightsEntry;
  std::shared_ptr<FreeEntry> thingTorchLightsEntry;

  Group landGroups[2];
  Group vegetationGroups[1];
  Group thingGroups[1];

  std::shared_ptr<PhysicsObject> landPhysxObject;
  std::vector<std::shared_ptr<PhysicsObject>> vegetationPhysxObjects;
  std::vector<std::shared_ptr<PhysicsObject>> thingPhysxObjects;

  // build state
  bool live;
};

class NeededCoords {
public:
  NeededCoords(std::map<int, std::shared_ptr<Subparcel>> &&subparcelMap) : subparcelMap(std::move(subparcelMap)), numAddedSubparcels(0) {
    subparcels.reserve(this->subparcelMap.size());
    for (const auto &iter : this->subparcelMap) {
      subparcels.push_back(iter.second.get());
    }
    subparcelsPtr = subparcels.data();
    numAddedSubparcels = subparcels.size();
  }

  Subparcel **subparcelsPtr;
  unsigned int numAddedSubparcels;
  std::map<int, std::shared_ptr<Subparcel>> subparcelMap;
  std::vector<Subparcel *> subparcels;
};

#endif