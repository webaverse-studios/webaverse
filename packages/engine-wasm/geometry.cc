#include "geometry.h"
#include "vector.h"

inline unsigned int align4(unsigned int n) {
  unsigned int d = n%4;
  return d ? (n+4-d) : n;
}

bool GetAttributeFloatForAllPoints(const draco::PointCloud &pc,
                                            const draco::PointAttribute &pa,
                                            std::vector<float> &out_values) {
  const int components = pa.num_components();
  const int num_points = pc.num_points();
  const int num_entries = num_points * components;
  const int kMaxAttributeFloatValues = 4;
  float values[kMaxAttributeFloatValues] = {-2.0, -2.0, -2.0, -2.0};
  int entry_id = 0;

  out_values.resize(num_entries);
  for (draco::PointIndex i(0); i < num_points; ++i) {
    const draco::AttributeValueIndex val_index = pa.mapped_index(i);
    if (!pa.ConvertValue<float>(val_index, values)) {
      return false;
    }
    for (int j = 0; j < components; ++j) {
      out_values[entry_id++] = values[j];
    }
  }
  return true;
}
template <class DracoArrayT, class ValueTypeT>
bool GetAttributeDataForAllPoints(const draco::PointCloud &pc,
                                         const draco::PointAttribute &pa,
                                         draco::DataType draco_signed_type,
                                         draco::DataType draco_unsigned_type,
                                         DracoArrayT &out_values) {
  const int components = pa.num_components();
  const int num_points = pc.num_points();
  const int num_entries = num_points * components;

  /* if ((pa.data_type() == draco_signed_type ||
       pa.data_type() == draco_unsigned_type) &&
      pa.is_mapping_identity()) {
    // Copy values directly to the output vector.
    const ValueTypeT *ptr = reinterpret_cast<const ValueTypeT *>(
        pa.GetAddress(draco::AttributeValueIndex(0)));
    out_values->MoveData({ptr, ptr + num_entries});
    return true;
  } */

  // Copy values one by one.
  std::vector<ValueTypeT> values(components);
  int entry_id = 0;

  out_values.resize(num_entries);
  for (draco::PointIndex i(0); i < num_points; ++i) {
    const draco::AttributeValueIndex val_index = pa.mapped_index(i);
    if (!pa.ConvertValue<ValueTypeT>(val_index, &values[0])) {
      return false;
    }
    for (int j = 0; j < components; ++j) {
      out_values[entry_id++] = values[j];
    }
  }
  return true;
}
bool GetAttributeUInt8ForAllPoints(const draco::PointCloud &pc,
                                            const draco::PointAttribute &pa,
                                            std::vector<unsigned char> &out_values) {
  return GetAttributeDataForAllPoints<std::vector<unsigned char>, uint8_t>(
      pc, pa, draco::DT_INT8, draco::DT_UINT8, out_values);
}

GeometrySet *doMakeGeometrySet() {
	return new GeometrySet();
}

std::pair<float, float> doAllocTexture(Tracker *tracker, unsigned char *texture) {
	unsigned int i;
	for (i = 0; i < tracker->atlasFreeList.size(); i++) {
		if (!tracker->atlasFreeList[i]) {
			break;
		}
	}
	if (i < tracker->atlasFreeList.size()) {
	  tracker->atlasFreeList[i] = 1;
    const unsigned int su = i % maxAtlasTextureRowObjects;
    const unsigned int sv = (i - su)/maxAtlasTextureRowObjects;

    const unsigned int pu = su * objectTextureSize;
    const unsigned int pv = sv * objectTextureSize;
    for (unsigned int dv = 0; dv < objectTextureSize; dv++) {
    	memcpy(tracker->atlasTexture.data() + pu*4 + (pv + dv)*atlasTextureSize*4, texture + dv*objectTextureSize*4, objectTextureSize*4);
    }

    const float u = (float)su;
    const float v = (float)sv;
    return std::pair<float, float>(u, v);
	} else {
		std::cout << "count not allocate texture" << std::endl;
		abort();
		return std::pair<float, float>();
	}
}

void doLoadBake(GeometrySet *geometrySet, unsigned char *data, unsigned int size) {
  unsigned int index = 0;
  while (index < size) {
    unsigned int geometrySize = *((unsigned int *)(data + index));
	  index += sizeof(unsigned int);
	  unsigned char *geometryData = data + index;
	  index += geometrySize;
	  index = align4(index);

    Geometry *geometry = new Geometry();

	  draco::Decoder decoder;

	  draco::DecoderBuffer buffer;
	  buffer.Init((char *)geometryData, geometrySize);

    auto sor = decoder.DecodeMeshFromBuffer(&buffer);
		const std::unique_ptr<draco::Mesh> &mesh = sor.value();
		if (!mesh) {
			auto &status = sor.status();
			std::cout << "failed to load bake: " << status.code() << " " << status.error_msg_string() << std::endl;
		}

		const draco::GeometryMetadata *metadata = mesh->GetMetadata();
		std::string name;
		bool ok = metadata->GetEntryString("name", &name);
		int transparent;
		metadata->GetEntryInt("transparent", &transparent);
    geometry->transparent = (bool)transparent;
	  int vegetation;
		metadata->GetEntryInt("vegetation", &vegetation);
    geometry->vegetation = (bool)vegetation;
		int animal;
		metadata->GetEntryInt("animal", &animal);
    geometry->animal = (bool)animal;

	  int numPositions;
	  {
		  const draco::PointAttribute *attribute = mesh->GetNamedAttribute(draco::GeometryAttribute::POSITION);
		  int numComponents = attribute->num_components();
		  int numPoints = mesh->num_points();
		  numPositions = numPoints * numComponents;

      GetAttributeFloatForAllPoints(*mesh, *attribute, geometry->positions);
		}
		{
		  const draco::PointAttribute *attribute = mesh->GetNamedAttribute(draco::GeometryAttribute::TEX_COORD);
		  if (attribute) {
			  // int numComponents = attribute->num_components();
			  // int numPoints = mesh->num_points();
			  // int numValues = numPoints * numComponents;

			  GetAttributeFloatForAllPoints(*mesh, *attribute, geometry->uvs);
			} else {
				geometry->uvs.resize(numPositions/3*2);
			}
		}
		{
		  const draco::PointAttribute *attribute = mesh->GetNamedAttribute(draco::GeometryAttribute::COLOR);
		  if (attribute) {
			  // int numComponents = attribute->num_components();
			  // int numPoints = mesh->num_points();
			  // int numValues = numPoints * numComponents;

	      GetAttributeUInt8ForAllPoints(*mesh, *attribute, geometry->colors);
			} else {
				geometry->colors.resize(numPositions);
			}
		}
		{
	    int numFaces = mesh->num_faces();
	    int numIndices = numFaces * 3;

	    geometry->indices.resize(numIndices);

	    for (draco::FaceIndex i(0); i < numFaces; i++) {
	    	const draco::Mesh::Face &face = mesh->face(i);
	    	geometry->indices[i.value()*3] = face[0].value();
	    	geometry->indices[i.value()*3+1] = face[1].value();
	    	geometry->indices[i.value()*3+2] = face[2].value();
	    }
	  }

    geometry->aabb.setFromPositions(geometry->positions.data(), geometry->positions.size()); // XXX can be precomputed

	  geometrySet->geometries.push_back(geometry);
	  if (animal) {
	    Vec center = geometry->aabb.center();
	    Vec size = geometry->aabb.size();
	    geometry->headPivot = center + (size * Vec(0.0f, 1.0f/2.0f * 0.5f, -1.0f/2.0f * 0.5f));
	    Vec legsPivot = center + (size * Vec(0.0f, -1.0f/2.0f + 1.0f/3.0f, 0.0f));

		  constexpr float legsSepFactor = 0.5;
		  Vec legsPivotTopLeft = legsPivot + (size * Vec(-1.0f/2.0f * legsSepFactor, 0.0f, -1.0f/2.0f * legsSepFactor));
	    Vec legsPivotTopRight = legsPivot + (size * Vec(1.0f/2.0f * legsSepFactor, 0.0f, -1.0f/2.0f * legsSepFactor));
	    Vec legsPivotBottomLeft = legsPivot + (size * Vec(-1.0f/2.0f * legsSepFactor, 0.0f, 1.0f/2.0f * legsSepFactor));
	    Vec legsPivotBottomRight = legsPivot + (size * Vec(1.0f/2.0f * legsSepFactor, 0.0f, 1.0f/2.0f * legsSepFactor));

	    geometry->heads.resize(geometry->positions.size());
	    geometry->legs.resize(geometry->positions.size()/3*4);
		  for (unsigned int i = 0, j = 0; i < geometry->positions.size(); i += 3, j += 4) {
		  	Vec head{
	        geometry->positions[i],
	        geometry->positions[i+1],
	        geometry->positions[i+2],
		  	};
		    if (head.z < geometry->headPivot.z) {
		    	head -= geometry->headPivot;
		    } else {
		    	head = Vec(0, 0, 0);
		    }
		    geometry->heads[i] = head.x;
		    geometry->heads[i+1] = head.y;
		    geometry->heads[i+2] = head.z;

	      Vec position{
	        geometry->positions[i],
	        geometry->positions[i+1],
	        geometry->positions[i+2],
		  	};
		    float xAxis;
		    if (position.y < legsPivot.y) {
		      if (position.x >= legsPivot.x) {
		        if (position.z >= legsPivot.z) {
		          position -= legsPivotBottomRight;
		          xAxis = 1;
		        } else {
		          position -= legsPivotTopRight;
		          xAxis = -1;
		        }
		      } else {
		        if (position.z >= legsPivot.z) {
		          position -= legsPivotBottomLeft;
		          xAxis = -1;
		        } else {
		          position -= legsPivotTopLeft;
		          xAxis = 1;
		        }
		      }
		    } else {
		    	position = Vec(0, 0, 0);
		      xAxis = 0;
		    }
		    geometry->legs[j] = position.x;
		    geometry->legs[j+1] = position.y;
		    geometry->legs[j+2] = position.z;
		    geometry->legs[j+3] = xAxis;
		  }

	    geometrySet->animalGeometries.push_back(geometry);
	  }
	  geometrySet->geometryMap[name] = geometry;
  }
}

void doGetGeometry(GeometrySet *geometrySet, char *nameData, unsigned int nameSize, float **positions, float **uvs, unsigned int **indices, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIndices, float **aabb) {
  std::string name(nameData, nameSize);
  Geometry *geometry = geometrySet->geometryMap[name];

  *positions = geometry->positions.data();
  *uvs = geometry->uvs.data();
  *indices = geometry->indices.data();

  numPositions = geometry->positions.size();
  numUvs = geometry->uvs.size();
  numIndices = geometry->indices.size();

  *aabb = &geometry->aabb.min.x;
}

void doGetGeometries(GeometrySet *geometrySet, GeometryRequest *geometryRequests, unsigned int numGeometryRequests, float **positions, float **uvs, unsigned int **indices, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIndices) {
  unsigned int numTotalPositions = 0;
  unsigned int numTotalUvs = 0;
  unsigned int numTotalIndices = 0;
  {
    for (unsigned int i = 0; i < numGeometryRequests; i++) {
      const GeometryRequest &geometryRequest = geometryRequests[i];
      std::string name(geometryRequest.name);
      auto iter = geometrySet->geometryMap.find(name);
      if (iter != geometrySet->geometryMap.end()) {
        Geometry *geometry = iter->second;
        numTotalPositions += geometry->positions.size();
        numTotalUvs += geometry->uvs.size();
        numTotalIndices += geometry->indices.size();
      } else {
        std::cout << "cannot find geometry name " << name << std::endl;
        abort();
      }
    }
  }
  // std::cout << "totals " << numGeometryRequests << " " << numTotalPositions << " " << numTotalUvs << " " << numIndices << std::endl;
  *positions = (float *)malloc(numTotalPositions*sizeof(float));
  *uvs = (float *)malloc(numTotalUvs*sizeof(float));
  *indices = (unsigned int *)malloc(numTotalIndices*sizeof(unsigned int));

  unsigned int &positionIndex = numPositions;
  unsigned int &uvIndex = numUvs;
  unsigned int &indicesIndex = numIndices;
  positionIndex = 0;
  uvIndex = 0;
  indicesIndex = 0;

  for (unsigned int i = 0; i < numGeometryRequests; i++) {
    const GeometryRequest &geometryRequest = geometryRequests[i];
    std::string name(geometryRequest.name);
    auto iter = geometrySet->geometryMap.find(name);

    Geometry *geometry = iter->second;
    Matrix matrix;
    matrix.compose(
      geometryRequest.position,
      geometryRequest.quaternion,
      geometryRequest.scale
    );

    unsigned int indexOffset = positionIndex/3;
    for (unsigned int j = 0; j < geometry->indices.size(); j++) {
      (*indices)[indicesIndex + j] = geometry->indices[j] + indexOffset;
    }
    indicesIndex += geometry->indices.size();

    for (unsigned int j = 0; j < geometry->positions.size(); j += 3) {
      Vec position{
        geometry->positions[j],
        geometry->positions[j+1],
        geometry->positions[j+2],
      };
      position.applyMatrix(matrix);
      (*positions)[positionIndex + j] = position.x;
      (*positions)[positionIndex + j + 1] = position.y;
      (*positions)[positionIndex + j + 2] = position.z;
    }
    positionIndex += geometry->positions.size();

    memcpy(*uvs + uvIndex, geometry->uvs.data(), geometry->uvs.size()*sizeof(uvs[0]));
    uvIndex += geometry->uvs.size();

    /* memcpy(*indices + indicesIndex, geometry->uvs.data(), geometry->uvs.size()*sizeof(indices[0]));
    indicesIndex += geometry->indices.size(); */
  }
}

void doGetGeometryKeys(GeometrySet *geometrySet, char *names, unsigned int &numNames) {
  unsigned int &index = numNames;
  index = 0;
  for (const auto &iter : geometrySet->geometryMap) {
    Geometry *geometry = iter.second;
    if (!geometry->animal) {
      char *name = names + index*MAX_NAME_LENGTH;
      const std::string &key = iter.first;
      memcpy(name, key.c_str(), key.size()+1);
      index++;
    }
  }
}

void doGetAnimalGeometry(GeometrySet *geometrySet, unsigned int hash, float **positions, unsigned char **colors, unsigned int **indices, float **heads, float **legs, unsigned int &numPositions, unsigned int &numColors, unsigned int &numIndices, unsigned int &numHeads, unsigned int &numLegs, float *headPivot, float *aabb) {
  unsigned int animalGeometryIndex = (unsigned int)std::floor((float)hash/(float)0xFFFFFF*(float)geometrySet->animalGeometries.size());
  Geometry *geometry = geometrySet->animalGeometries[animalGeometryIndex];

  *positions = geometry->positions.data();
  *colors = geometry->colors.data();
  *indices = geometry->indices.data();
  *heads = geometry->heads.data();
  *legs = geometry->legs.data();

  numPositions = geometry->positions.size();
  numColors = geometry->colors.size();
  numIndices = geometry->indices.size();
  numHeads = geometry->heads.size();
  numLegs = geometry->legs.size();

  memcpy(headPivot, &geometry->headPivot, sizeof(geometry->headPivot));
  memcpy(aabb, &geometry->aabb, sizeof(geometry->aabb));
}

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
void doGetMarchObjectStats(GeometrySet *geometrySet, Subparcel *subparcel, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numIds, unsigned int &numIndices, unsigned int &numSkyLights, unsigned int &numTorchLights) {
  unsigned int &positionsIndex = numPositions;
  unsigned int &uvsIndex = numUvs;
  unsigned int &idsIndex = numIds;
  unsigned int &indicesIndex = numIndices;
  unsigned int &skyLightsIndex = numSkyLights;
  unsigned int &torchLightsIndex = numTorchLights;

  positionsIndex = 0;
  uvsIndex = 0;
  idsIndex = 0;
  indicesIndex = 0;
  skyLightsIndex = 0;
  torchLightsIndex = 0;

  for (unsigned int i = 0; i < subparcel->numObjects; i++) {
    Object &object = subparcel->objects[i];
    std::string name(object.name);
    auto iter = geometrySet->geometryMap.find(name);
    if (iter != geometrySet->geometryMap.end()) {
    	Geometry *geometry = iter->second;
	    positionsIndex += geometry->positions.size();
	    uvsIndex += geometry->uvs.size();
	    idsIndex += geometry->positions.size()/3;
	    indicesIndex += geometry->indices.size();
	    skyLightsIndex += geometry->positions.size()/3;
	    torchLightsIndex += geometry->positions.size()/3;
	  } /* else {
	  	std::cout << "failed to find object geometry for " << name << std::endl;
	  } */
  }
}
void doGetMarchThingStats(GeometrySet *geometrySet, Subparcel *subparcel, unsigned int &numPositions, unsigned int &numUvs, unsigned int &numAtlasUvs, unsigned int &numIds, unsigned int &numIndices, unsigned int &numSkyLights, unsigned int &numTorchLights) {
  unsigned int &positionsIndex = numPositions;
  unsigned int &uvsIndex = numUvs;
  unsigned int &atlasUvsIndex = numAtlasUvs;
  unsigned int &idsIndex = numIds;
  unsigned int &indicesIndex = numIndices;
  unsigned int &skyLightsIndex = numSkyLights;
  unsigned int &torchLightsIndex = numTorchLights;

  positionsIndex = 0;
  uvsIndex = 0;
  atlasUvsIndex = 0;
  idsIndex = 0;
  indicesIndex = 0;
  skyLightsIndex = 0;
  torchLightsIndex = 0;

  for (unsigned int i = 0; i < subparcel->numThings; i++) {
    Thing &thing = subparcel->things[i];
    std::string name(thing.name);
    auto iter = geometrySet->geometryMap.find(name);
    if (iter != geometrySet->geometryMap.end()) {
    	Geometry *geometry = iter->second;
	    positionsIndex += geometry->positions.size();
	    uvsIndex += geometry->uvs.size();
	    atlasUvsIndex += geometry->uvs.size();
	    idsIndex += geometry->positions.size()/3;
	    indicesIndex += geometry->indices.size();
	    skyLightsIndex += geometry->positions.size()/3;
	    torchLightsIndex += geometry->positions.size()/3;
	  } else {
	  	std::cout << "failed to find thing geometry for " << name << std::endl;
	  	abort();
	  }
  }
}
inline void doMarchObjectsRaw(Matrix &matrix, unsigned int id, float *atlasUvData, std::vector<float> &geometryPositions, std::vector<float> &geometryUvs, std::vector<unsigned int> &geometryIndices, Subparcel *subparcels, unsigned int numSubparcels, float *positions, float *uvs, float *atlasUvs, float *ids, unsigned int *indices, unsigned char *skyLights, unsigned char *torchLights, unsigned int &positionsIndex, unsigned int &uvsIndex, unsigned int *atlasUvsIndexPtr, unsigned int &idsIndex, unsigned int &indicesIndex, unsigned int &skyLightsIndex, unsigned int &torchLightsIndex, unsigned int indexOffset) {
  unsigned int indexOffset2 = indexOffset + positionsIndex/3;
  for (unsigned int j = 0; j < geometryIndices.size(); j++) {
    indices[indicesIndex + j] = geometryIndices[j] + indexOffset2;
  }
  indicesIndex += geometryIndices.size();

  for (unsigned int j = 0, jOffset = 0; j < geometryPositions.size(); j += 3, jOffset++) {
  	Vec position{
  		geometryPositions[j],
  		geometryPositions[j+1],
  		geometryPositions[j+2],
  	};
  	position.applyMatrix(matrix);
  	positions[positionsIndex + j] = position.x;
		positions[positionsIndex + j + 1] = position.y;
		positions[positionsIndex + j + 2] = position.z;

    int ax = (int)std::floor(position.x);
    int ay = (int)std::floor(position.y);
    int az = (int)std::floor(position.z);
    int sx = (int)std::floor((float)ax/(float)SUBPARCEL_SIZE);
    int sy = (int)std::floor((float)ay/(float)SUBPARCEL_SIZE);
    int sz = (int)std::floor((float)az/(float)SUBPARCEL_SIZE);
    int subparcelIndex = getSubparcelIndex(sx, sy, sz);
    Subparcel *subparcel = std::find_if(subparcels, subparcels + numSubparcels, [&](const Subparcel &subparcel) -> bool {
    	return subparcel.coord.index == subparcelIndex;
    });
    if (subparcel != subparcels + numSubparcels) {
      int lx = ax - SUBPARCEL_SIZE*sx;
      int ly = ay - SUBPARCEL_SIZE*sy;
      int lz = az - SUBPARCEL_SIZE*sz;
      unsigned int fieldIndex = getFieldIndex(lx, ly, lz);
      skyLights[skyLightsIndex + jOffset] = subparcel->heightfield[fieldIndex] < 0 ? 0 : subparcel->heightfield[fieldIndex];
      torchLights[torchLightsIndex + jOffset] = subparcel->lightfield[fieldIndex];
    } else {
      skyLights[skyLightsIndex + jOffset] = 0;
      torchLights[torchLightsIndex + jOffset] = 0;
    }
  }
  positionsIndex += geometryPositions.size();
  skyLightsIndex += geometryPositions.size()/3;
  torchLightsIndex += geometryPositions.size()/3;

  memcpy(uvs + uvsIndex, geometryUvs.data(), geometryUvs.size()*sizeof(float));
  uvsIndex += geometryUvs.size();

  if (atlasUvData) {
  	unsigned int &atlasUvsIndex = *atlasUvsIndexPtr;

	  for (unsigned int i = 0; i < geometryUvs.size(); i += 2) {
	  	atlasUvs[i] = atlasUvData[0];
	  	atlasUvs[i+1] = atlasUvData[1];
	    atlasUvsIndex += 2;
	  }
	}

  std::fill(ids + idsIndex, ids + idsIndex + geometryPositions.size()/3, (float)id);
  idsIndex += geometryPositions.size()/3;
}
void doMarchObjects(GeometrySet *geometrySet, int x, int y, int z, Subparcel *subparcel, Subparcel *subparcels, unsigned int numSubparcels, float *positions, float *uvs, float *ids, unsigned int *indices, unsigned char *skyLights, unsigned char *torchLights, unsigned int indexOffset) {
  unsigned int positionsIndex = 0;
  unsigned int uvsIndex = 0;
  unsigned int idsIndex = 0;
  unsigned int indicesIndex = 0;
  unsigned int skyLightsIndex = 0;
  unsigned int torchLightsIndex = 0;

  for (unsigned int i = 0; i < subparcel->numObjects; i++) {
    Object &object = subparcel->objects[i];
    std::string name(object.name);
    auto iter = geometrySet->geometryMap.find(name);
    if (iter != geometrySet->geometryMap.end()) {
    	Geometry *geometry = iter->second;

      Matrix matrix;
	    matrix.compose(object.position, object.quaternion, Vec{1, 1, 1});

    	doMarchObjectsRaw(matrix, object.id, nullptr, geometry->positions, geometry->uvs, geometry->indices, subparcels, numSubparcels, positions, uvs, nullptr, ids, indices, skyLights, torchLights, positionsIndex, uvsIndex, nullptr, idsIndex, indicesIndex, skyLightsIndex, torchLightsIndex, indexOffset);
	  }
  }
}
void doMarchThings(Tracker *tracker, GeometrySet *geometrySet, int x, int y, int z, Subparcel *subparcel, Subparcel *subparcels, unsigned int numSubparcels, float *positions, float *uvs, float *atlasUvs, float *ids, unsigned int *indices, unsigned char *skyLights, unsigned char *torchLights, unsigned int indexOffset, bool &textureUpdated) {
  unsigned int positionsIndex = 0;
  unsigned int uvsIndex = 0;
  unsigned int atlasUvsIndex = 0;
  unsigned int idsIndex = 0;
  unsigned int indicesIndex = 0;
  unsigned int skyLightsIndex = 0;
  unsigned int torchLightsIndex = 0;
  textureUpdated = false;

  for (unsigned int i = 0; i < subparcel->numThings; i++) {
    Thing &thing = subparcel->things[i];
    std::string name(thing.name);
    auto iter = geometrySet->geometryMap.find(name);
    if (iter != geometrySet->geometryMap.end()) {
    	Geometry *geometry = iter->second;

      float atlasUvData[2];
    	auto texIter = tracker->atlasTextureMap.find(name);
    	if (texIter != tracker->atlasTextureMap.end()) {
        atlasUvData[0] = texIter->second.first;
        atlasUvData[1] = texIter->second.second;
    	} else {
        std::pair<float, float> texUvs = doAllocTexture(tracker, geometry->texture);
        tracker->atlasTextureMap[name] = texUvs;
        atlasUvData[0] = texUvs.first;
        atlasUvData[1] = texUvs.second;

        textureUpdated = true;
    	}

      Matrix matrix;
	    matrix.compose(thing.position, thing.quaternion, Vec{1, 1, 1});

    	doMarchObjectsRaw(matrix, thing.id, atlasUvData, geometry->positions, geometry->uvs, geometry->indices, subparcels, numSubparcels, positions, uvs, atlasUvs, ids, indices, skyLights, torchLights, positionsIndex, uvsIndex, &atlasUvsIndex, idsIndex, indicesIndex, skyLightsIndex, torchLightsIndex, indexOffset);
	  }
  }
}

void polygonalizeObjects(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel) {
  // re-polygonalize
  unsigned int numPositions;
  unsigned int numUvs;
  unsigned int numIds;
  unsigned int numIndices;
  unsigned int numSkyLights;
  unsigned int numTorchLights;
  doGetMarchObjectStats(geometrySet, subparcel, numPositions, numUvs, numIds, numIndices, numSkyLights, numTorchLights);

  ArenaAllocator *positionsAllocator = tracker->vegetationPositionsAllocator;
  ArenaAllocator *uvsAllocator = tracker->vegetationUvsAllocator;
  ArenaAllocator *idsAllocator = tracker->vegetationIdsAllocator;
  ArenaAllocator *indicesAllocator = tracker->vegetationIndicesAllocator;
  ArenaAllocator *skyLightsAllocator = tracker->vegetationSkyLightsAllocator;
  ArenaAllocator *torchLightsAllocator = tracker->vegetationTorchLightsAllocator;
  // std::cout << "march objects b " << numPositions << " " << numUvs << " " << numIds << " " << numIndices << " " << numSkyLights << " " << numTorchLights << " " << (unsigned int)(void *)positionsAllocator << std::endl;

  subparcel->vegetationPositionsEntry = positionsAllocator->alloc(numPositions*sizeof(float));
  if (!subparcel->vegetationPositionsEntry) {
    std::cout << "could not allocate marchObjects positions" << std::endl;
    abort();
  }
  subparcel->vegetationUvsEntry = uvsAllocator->alloc(numUvs*sizeof(float));
  if (!subparcel->vegetationUvsEntry) {
    std::cout << "could not allocate marchObjects uvs" << std::endl;
    abort();
  }
  subparcel->vegetationIdsEntry = idsAllocator->alloc(numIds*sizeof(float));
  if (!subparcel->vegetationIdsEntry) {
    std::cout << "could not allocate marchObjects ids" << std::endl;
    abort();
  }
  subparcel->vegetationIndicesEntry = indicesAllocator->alloc(numIndices*sizeof(unsigned int));
  if (!subparcel->vegetationIndicesEntry) {
    std::cout << "could not allocate marchObjects indices" << std::endl;
    abort();
  }
  subparcel->vegetationSkyLightsEntry = skyLightsAllocator->alloc(numSkyLights*sizeof(unsigned char));
  if (!subparcel->vegetationSkyLightsEntry) {
    std::cout << "could not allocate marchObjects skyLights" << std::endl;
    abort();
  }
  subparcel->vegetationTorchLightsEntry = torchLightsAllocator->alloc(numTorchLights*sizeof(unsigned char));
  if (!subparcel->vegetationTorchLightsEntry) {
    std::cout << "could not allocate marchObjects torchLights" << std::endl;
    abort();
  }

  // std::cout << "march objects c " << numPositions << " " << numUvs << " " << numIds << " " << numIndices << " " << numSkyLights << " " << numTorchLights << std::endl;

  float *positions = (float *)(positionsAllocator->data + subparcel->vegetationPositionsEntry->spec.start);
  float *uvs = (float *)(uvsAllocator->data + subparcel->vegetationUvsEntry->spec.start);
  float *ids = (float *)(idsAllocator->data + subparcel->vegetationIdsEntry->spec.start);
  unsigned int *indices = (unsigned int *)(indicesAllocator->data + subparcel->vegetationIndicesEntry->spec.start);
  unsigned char *skyLights = (unsigned char *)(skyLightsAllocator->data + subparcel->vegetationSkyLightsEntry->spec.start);
  unsigned char *torchLights = (unsigned char *)(torchLightsAllocator->data + subparcel->vegetationTorchLightsEntry->spec.start);

  unsigned int indexOffset = subparcel->vegetationPositionsEntry->spec.start/sizeof(float)/3;

  Subparcel *subparcels = nullptr;
  unsigned int numSubparcels = 0;
  doMarchObjects(geometrySet, subparcel->coord.x, subparcel->coord.y, subparcel->coord.z, subparcel, subparcels, numSubparcels, positions, uvs, ids, indices, skyLights, torchLights, indexOffset);

  subparcel->vegetationGroups[0].start = subparcel->vegetationIndicesEntry->spec.start/sizeof(unsigned int);
  subparcel->vegetationGroups[0].count = subparcel->vegetationIndicesEntry->spec.count/sizeof(unsigned int);
  subparcel->vegetationGroups[0].materialIndex = 0;
}
void polygonalizeThings(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel, bool &textureUpdated) {
  // re-polygonalize
  unsigned int numPositions;
  unsigned int numUvs;
  unsigned int numAtlasUvs;
  unsigned int numIds;
  unsigned int numIndices;
  unsigned int numSkyLights;
  unsigned int numTorchLights;
  doGetMarchThingStats(geometrySet, subparcel, numPositions, numUvs, numAtlasUvs, numIds, numIndices, numSkyLights, numTorchLights);

  ArenaAllocator *positionsAllocator = tracker->thingPositionsAllocator;
  ArenaAllocator *uvsAllocator = tracker->thingUvsAllocator;
  ArenaAllocator *atlasUvsAllocator = tracker->thingAtlasUvsAllocator;
  ArenaAllocator *idsAllocator = tracker->thingIdsAllocator;
  ArenaAllocator *indicesAllocator = tracker->thingIndicesAllocator;
  ArenaAllocator *skyLightsAllocator = tracker->thingSkyLightsAllocator;
  ArenaAllocator *torchLightsAllocator = tracker->thingTorchLightsAllocator;
  // std::cout << "march objects b " << numPositions << " " << numUvs << " " << numIds << " " << numIndices << " " << numSkyLights << " " << numTorchLights << " " << (unsigned int)(void *)positionsAllocator << std::endl;

  subparcel->thingPositionsEntry = positionsAllocator->alloc(numPositions*sizeof(float));
  if (!subparcel->thingPositionsEntry) {
    std::cout << "could not allocate marchThings positions" << std::endl;
    abort();
  }
  subparcel->thingUvsEntry = uvsAllocator->alloc(numUvs*sizeof(float));
  if (!subparcel->thingUvsEntry) {
    std::cout << "could not allocate marchThings uvs" << std::endl;
    abort();
  }
  subparcel->thingAtlasUvsEntry = atlasUvsAllocator->alloc(numUvs*sizeof(float));
  if (!subparcel->thingUvsEntry) {
    std::cout << "could not allocate marchThings uvs" << std::endl;
    abort();
  }
  subparcel->thingIdsEntry = idsAllocator->alloc(numIds*sizeof(float));
  if (!subparcel->thingIdsEntry) {
    std::cout << "could not allocate marchThings ids" << std::endl;
    abort();
  }
  subparcel->thingIndicesEntry = indicesAllocator->alloc(numIndices*sizeof(unsigned int));
  if (!subparcel->thingIndicesEntry) {
    std::cout << "could not allocate marchThings indices" << std::endl;
    abort();
  }
  subparcel->thingSkyLightsEntry = skyLightsAllocator->alloc(numSkyLights*sizeof(unsigned char));
  if (!subparcel->thingSkyLightsEntry) {
    std::cout << "could not allocate marchThings skyLights" << std::endl;
    abort();
  }
  subparcel->thingTorchLightsEntry = torchLightsAllocator->alloc(numTorchLights*sizeof(unsigned char));
  if (!subparcel->thingTorchLightsEntry) {
    std::cout << "could not allocate marchThings torchLights" << std::endl;
    abort();
  }

  // std::cout << "march objects c " << numPositions << " " << numUvs << " " << numIds << " " << numIndices << " " << numSkyLights << " " << numTorchLights << std::endl;

  float *positions = (float *)(positionsAllocator->data + subparcel->thingPositionsEntry->spec.start);
  float *uvs = (float *)(uvsAllocator->data + subparcel->thingUvsEntry->spec.start);
  float *atlasUvs = (float *)(atlasUvsAllocator->data + subparcel->thingUvsEntry->spec.start);
  float *ids = (float *)(idsAllocator->data + subparcel->thingIdsEntry->spec.start);
  unsigned int *indices = (unsigned int *)(indicesAllocator->data + subparcel->thingIndicesEntry->spec.start);
  unsigned char *skyLights = (unsigned char *)(skyLightsAllocator->data + subparcel->thingSkyLightsEntry->spec.start);
  unsigned char *torchLights = (unsigned char *)(torchLightsAllocator->data + subparcel->thingTorchLightsEntry->spec.start);

  unsigned int indexOffset = subparcel->thingPositionsEntry->spec.start/sizeof(float)/3;

  Subparcel *subparcels = nullptr;
  unsigned int numSubparcels = 0;
  doMarchThings(tracker, geometrySet, subparcel->coord.x, subparcel->coord.y, subparcel->coord.z, subparcel, subparcels, numSubparcels, positions, uvs, atlasUvs, ids, indices, skyLights, torchLights, indexOffset, textureUpdated);

  subparcel->thingGroups[0].start = subparcel->thingIndicesEntry->spec.start/sizeof(unsigned int);
  subparcel->thingGroups[0].count = subparcel->thingIndicesEntry->spec.count/sizeof(unsigned int);
  subparcel->thingGroups[0].materialIndex = 0;
}

std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>> doAddObject(Tracker *tracker, GeometrySet *geometrySet, OBJECT_TYPE type, const char *name, float *position, float *quaternion) {
  const int sx = (int)std::floor(position[0]/(float)SUBPARCEL_SIZE);
  const int sy = (int)std::floor(position[1]/(float)SUBPARCEL_SIZE);
  const int sz = (int)std::floor(position[2]/(float)SUBPARCEL_SIZE);
  int index = getSubparcelIndex(sx, sy, sz);
  
  std::shared_ptr<Subparcel> subparcel;
  {
    std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);
    auto subparcelIter = tracker->subparcels.find(index);
    if (subparcelIter != tracker->subparcels.end()) {
      if (subparcel->live) {
        std::shared_ptr<Subparcel> &oldSubparcel = subparcelIter->second;
        
        subparcel = std::shared_ptr<Subparcel>(oldSubparcel->clone());
        
        subparcel->copyLand(*oldSubparcel);
        oldSubparcel->live = false;
      } else {
      	return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>>(false, 0, std::vector<std::shared_ptr<Subparcel>>());
        // std::cout << "cannot edit dead index " << sx << " " << sy << " " << sz << std::endl;
        // abort();
      }
    } else {
      return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>>(false, 0, std::vector<std::shared_ptr<Subparcel>>());
    }
  }
  
  std::vector<std::shared_ptr<Subparcel>> result;
  unsigned int objectId = 0;
  if (subparcel) {
    objectId = (unsigned int)rand();

    Object &o = subparcel->objects[subparcel->numObjects];
    o.id = objectId;
    o.type = type;
    memcpy(o.name, name, sizeof(o.name));
    o.position = Vec{
      position[0],
      position[1],
      position[2],
    };
    o.quaternion = Quat{
      quaternion[0],
      quaternion[1],
      quaternion[2],
      quaternion[3],
    };
    subparcel->numObjects++;

    polygonalizeObjects(tracker, geometrySet, subparcel.get());

    result.push_back(std::move(subparcel));
  }
  return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>>(true, objectId, std::move(result));
}
std::pair<bool, std::vector<std::shared_ptr<Subparcel>>> doRemoveObject(Tracker *tracker, GeometrySet *geometrySet, int index, unsigned int objectId) {
  std::shared_ptr<Subparcel> subparcel;
  {
    std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);
    auto subparcelIter = tracker->subparcels.find(index);
    if (subparcelIter != tracker->subparcels.end()) {
      if (subparcel->live) {
        std::shared_ptr<Subparcel> &oldSubparcel = subparcelIter->second;
        
        subparcel = std::shared_ptr<Subparcel>(oldSubparcel->clone());
        
        subparcel->copyLand(*oldSubparcel);
        oldSubparcel->live = false;
      } else {
      	return std::pair<bool, std::vector<std::shared_ptr<Subparcel>>>(false, std::vector<std::shared_ptr<Subparcel>>());
        // std::cout << "cannot edit dead index " << index << std::endl;
        // abort();
      }
    } else {
      return std::pair<bool, std::vector<std::shared_ptr<Subparcel>>>(false, std::vector<std::shared_ptr<Subparcel>>());
    }
  }
  
  std::vector<std::shared_ptr<Subparcel>> result;
  if (subparcel) {
    Object *objectsEnd = ((Object *)subparcel->objects) + subparcel->numObjects;
    auto objectIter = std::find_if(subparcel->objects, objectsEnd, [&](const Object &object) -> bool {
      return object.id == objectId;
    });
    if (objectIter) {
      while ((objectIter + 1) != objectsEnd) {
        *objectIter = *(objectIter + 1);
        objectIter++;
      }
      subparcel->numObjects--;

      polygonalizeObjects(tracker, geometrySet, subparcel.get());
    }
    result.push_back(std::move(subparcel));
  }
  return std::pair<bool, std::vector<std::shared_ptr<Subparcel>>>(true, std::move(result));
}
std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>, bool> doAddThing(Tracker *tracker, GeometrySet *geometrySet, const char *name, float *position, float *quaternion) {
  const int sx = (int)std::floor(position[0]/(float)SUBPARCEL_SIZE);
  const int sy = (int)std::floor(position[1]/(float)SUBPARCEL_SIZE);
  const int sz = (int)std::floor(position[2]/(float)SUBPARCEL_SIZE);
  int index = getSubparcelIndex(sx, sy, sz);

  std::shared_ptr<Subparcel> subparcel;
  {
    std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);
    auto subparcelIter = tracker->subparcels.find(index);
    if (subparcelIter != tracker->subparcels.end()) {
      if (subparcel->live) {
        std::shared_ptr<Subparcel> &oldSubparcel = subparcelIter->second;
        
        subparcel = std::shared_ptr<Subparcel>(oldSubparcel->clone());
        
        subparcel->copyLand(*oldSubparcel);
        oldSubparcel->live = false;
      } else {
      	return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>, bool>(false, 0, std::vector<std::shared_ptr<Subparcel>>(), false);
        // std::cout << "cannot edit dead index " << sx << " " << sy << " " << sz << std::endl;
        // abort();
      }
    } else {
      return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>, bool>(false, 0, std::vector<std::shared_ptr<Subparcel>>(), false);
    }
  }
  
  std::vector<std::shared_ptr<Subparcel>> result;
  unsigned int objectId = 0;
  bool textureUpdated = false;
  if (subparcel) {
    objectId = (unsigned int)rand();

    Thing &t = subparcel->things[subparcel->numThings];
    t.id = objectId;
    memcpy(t.name, name, sizeof(t.name));
    t.position = Vec{
      position[0],
      position[1],
      position[2],
    };
    t.quaternion = Quat{
      quaternion[0],
      quaternion[1],
      quaternion[2],
      quaternion[3],
    };
    subparcel->numThings++;

    polygonalizeThings(tracker, geometrySet, subparcel.get(), textureUpdated);

    result.push_back(std::move(subparcel));
  }
  return std::tuple<bool, unsigned int, std::vector<std::shared_ptr<Subparcel>>, bool>(true, objectId, std::move(result), textureUpdated);
}