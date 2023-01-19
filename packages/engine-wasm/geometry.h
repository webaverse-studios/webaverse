#include "subparcel.h"
#include "draco/compression/decode.h"
#include "draco/compression/encode.h"
// #include "draco/mesh/triangle_soup_mesh_builder.h"
// #include "draco/javascript/emscripten/encoder_webidl_wrapper.h"

class Geometry {
public:
  std::string name;
  bool transparent;
  bool vegetation;
  bool animal;
  std::vector<float> positions;
  std::vector<float> uvs;
  std::vector<unsigned char> colors;
  std::vector<unsigned int> indices;
  std::vector<float> heads;
  std::vector<float> legs;
  Vec headPivot;
  Box aabb;
  unsigned char *texture;

  std::shared_ptr<PhysicsGeometry> physicsGeometry;
  std::shared_ptr<PhysicsGeometry> dynamicPhysicsGeometry;
};
class GeometrySet {
public:
	std::vector<Geometry *> geometries;
	std::vector<Geometry *> animalGeometries;
	std::vector<Geometry *> thingGeometries;
	std::map<std::string, Geometry *> geometryMap;
};
class GeometryRequest {
public:
  char name[MAX_NAME_LENGTH];
  Vec position;
  Quat quaternion;
  Vec scale;
};

GeometrySet *doMakeGeometrySet();
std::pair<float, float> doAllocTexture(Tracker *tracker);
void doLoadBake(GeometrySet *geometrySet, unsigned char *data, unsigned int size);
void doGetGeometry(GeometrySet *geometrySet, char *nameData, unsigned int nameSize, float **positions, float **uvs, unsigned int **indices, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIndices, float **aabb);
void doGetGeometries(GeometrySet *geometrySet, GeometryRequest *geometryRequests, unsigned int numGeometryRequests, float **positions, float **uvs, unsigned int **indices, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIndices);
void doGetGeometryKeys(GeometrySet *geometrySet, char *names, unsigned int &numNames);
void doGetAnimalGeometry(GeometrySet *geometrySet, unsigned int hash, float **positions, unsigned char **colors, unsigned int **indices, float **heads, float **legs, unsigned int &numPositions, unsigned int &numColors, unsigned int &numIndices, unsigned int &numHeads, unsigned int &numLegs, float *headPivot, float *aabb);

/* class MarchObject {
public:
	unsigned int id;
	char name[MAX_NAME_LENGTH];
	unsigned int nameLength;
	Vec position;
	Quat quaternion;
};
class SubparcelObject {
public:
	int index;
  char heightfield[SUBPARCEL_SIZE_P1*SUBPARCEL_SIZE_P1*SUBPARCEL_SIZE_P1 + 1]; // align
  unsigned char lightfield[SUBPARCEL_SIZE_P1*SUBPARCEL_SIZE_P1*SUBPARCEL_SIZE_P1 + 1]; // align
}; */
void doGetMarchObjectStats(GeometrySet *geometrySet, Subparcel *subparcel, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIds, unsigned int &numIndices, unsigned int &numSkyLights, unsigned int &numTorchLights);
void doGetMarchThingStats(GeometrySet *geometrySet, Subparcel *subparcel, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numAtlasUvs, unsigned int &numIds, unsigned int &numIndices, unsigned int &numSkyLights, unsigned int &numTorchLights);
void doMarchObjects(GeometrySet *geometrySet, int x, int y, int z, Subparcel *subparcel, Subparcel *subparcels, unsigned int numSubparcels, float *positions, float *uvs, float *ids, unsigned int *indices, unsigned char *skyLights, unsigned char *torchLights, unsigned int indexOffset);
void doMarchThings(Tracker *tracker, GeometrySet *geometrySet, int x, int y, int z, Subparcel *subparcel, Subparcel *subparcels, unsigned int numSubparcels, float *positions, float *uvs, float *atlasUvs, float *ids, unsigned int *indices, unsigned char *skyLights, unsigned char *torchLights, unsigned int indexOffset, bool &textureUpdated);
void polygonalizeObjects(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel);
std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>> doAddObject(Tracker *tracker, GeometrySet *geometrySet, OBJECT_TYPE type, const char *name, float *position, float *quaternion);
std::pair<bool, std::vector<std::shared_ptr<Subparcel>>> doRemoveObject(Tracker *tracker, GeometrySet *geometrySet, int index, unsigned int objectId);
std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>, bool> doAddThing(Tracker *tracker, GeometrySet *geometrySet, const char *name, float *position, float *quaternion);