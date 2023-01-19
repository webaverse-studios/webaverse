mkdir -p bin
if [ ! -f physx-timestamp ]; then
  echo 'building physx...'
  emcc -O3 \
  -IPhysX/physx/include -IPhysX/pxshared/include \
  -IPhysX/physx/source/foundation/include \
  -IPhysX/physx/source/pvd/include \
  -IPhysX/physx/source/simulationcontroller/include -IPhysX/physx/source/lowlevel/api/include \
  -IPhysX/physx/source/geomutils/include \
  -IPhysX/physx/source/scenequery/include \
  -IPhysX/physx/source/lowleveldynamics/include \
  -IPhysX/physx/source/lowlevel/software/include \
  -IPhysX/physx/source/lowlevelaabb/include \
  -IPhysX/physx/source/lowlevel/common/include/pipeline \
  -IPhysX/physx/source/lowlevel/common/include/utils \
  -IPhysX/physx/source/lowlevel/common/include/collision \
  -IPhysX/physx/source/geomutils/src -IPhysX/physx/source/geomutils/src/common -IPhysX/physx/source/geomutils/src/mesh -IPhysX/physx/source/geomutils/src/hf -IPhysX/physx/source/geomutils/src/convex -IPhysX/physx/source/geomutils/src/gjk \
  -IPhysX/physx/source/common/src \
  -IPhysX/physx/source/physx/src/buffering \
  -IPhysX/physx/source/physx/src \
  -IPhysX/physx/source/physxcooking/src/convex \
  -IPhysX/physx/source/physxcooking/src/mesh \
  -IPhysX/physx/source/physxextensions/src/serialization/File \
  -IPhysX/physx/source/physxcooking/src \
  -IPhysX/physx/source/simulationcontroller/src \
  -IPhysX/physx/source/geomutils/src/intersection \
  -IPhysX//physx/source/geomutils/src/ccd \
  -IPhysX/physx/source/geomutils/src/contact \
  -IPhysX/physx/source/geomutils/src/pcm \
  -IPhysX/physx/source/geomutils/src/distance \
  -IPhysX/physx/source/geomutils/src/sweep \
  PhysX/physx/source/geomutils/src/GuGeometryQuery.cpp \
  PhysX/physx/source/geomutils/src/GuMTD.cpp \
  PhysX/physx/source/common/src/CmMathUtils.cpp \
  PhysX/physx/source/physx/src/NpPhysics.cpp \
  PhysX/physx/source/physxcooking/src/Cooking.cpp \
  PhysX/physx/source/foundation/src/PsFoundation.cpp \
  PhysX/physx/source/physxextensions/src/ExtDefaultErrorCallback.cpp \
  PhysX/physx/source/physxextensions/src/ExtDefaultStreams.cpp \
  PhysX/physx/source/geomutils/src/GuSerialize.cpp \
  PhysX/physx/source/physx/src/NpFactory.cpp \
  PhysX/physx/source/geomutils/src/GuMeshFactory.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuMeshQuery.cpp \
  PhysX/physx/source/geomutils/src/convex/GuConvexMesh.cpp \
  PhysX/physx/source/physxcooking/src/convex/ConvexMeshBuilder.cpp \
  PhysX/physx/source/physx/src/NpMaterial.cpp \
  PhysX/physx/source/physx/src/NpAggregate.cpp \
  PhysX/physx/source/physx/src/NpConstraint.cpp \
  PhysX/physx/source/geomutils/src/convex/GuBigConvexData.cpp \
  PhysX/physx/source/physxcooking/src/convex/BigConvexDataBuilder.cpp \
  PhysX/physx/source/physx/src/NpRigidStatic.cpp \
  PhysX/physx/source/physx/src/NpArticulation.cpp \
  PhysX/physx/source/physxcooking/src/BVHStructureBuilder.cpp \
  PhysX/physx/source/geomutils/src/GuBVHStructure.cpp \
  PhysX/physx/source/physx/src/NpShapeManager.cpp \
  PhysX/physx/source/physxcooking/src/convex/ConvexHullBuilder.cpp \
  PhysX/physx/source/physx/src/NpActor.cpp \
  PhysX/physx/source/physx/src/NpArticulationLink.cpp \
  PhysX/physx/source/physx/src/NpRigidDynamic.cpp \
  PhysX/physx/source/physx/src/NpScene.cpp \
  PhysX/physx/source/simulationcontroller/src/ScArticulationCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScArticulationJointCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScStaticCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScNPhaseCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScActorCore.cpp \
  PhysX/physx/source/physxcooking/src/mesh/TriangleMeshBuilder.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuTriangleMesh.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuTriangleMeshRTree.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuTriangleMeshBV4.cpp \
  PhysX/physx/source/physxcooking/src/mesh/MeshBuilder.cpp \
  PhysX/physx/source/physx/src/buffering/ScbScene.cpp \
  PhysX/physx/source/scenequery/src/SqSceneQueryManager.cpp \
  PhysX/physx/source/physx/src/NpShape.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixMutex.cpp \
  PhysX/physx/source/geomutils/src/hf/GuHeightFieldUtil.cpp \
  PhysX/physx/source/simulationcontroller/src/ScBodyCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScShapeCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScRigidCore.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintCore.cpp \
  PhysX/physx/source/physx/src/NpBatchQuery.cpp \
  PhysX/physx/source/physx/src/NpSceneQueries.cpp \
  PhysX/physx/source/simulationcontroller/src/ScScene.cpp \
  PhysX/physx/source/foundation/src/PsTempAllocator.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcContactCache.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsContext.cpp \
  PhysX/physx/source/common/src/CmPtrTable.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuBV4.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuBV4Build.cpp \
  PhysX/physx/source/simulationcontroller/src/ScBodySim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScRigidSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScArticulationSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScArticulationJointSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScShapeSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScActorSim.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsIslandSim.cpp \
  PhysX/physx/source/physx/src/NpArticulationReducedCoordinate.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintGroupNode.cpp \
  PhysX/physx/source/simulationcontroller/src/ScSqBoundsManager.cpp \
  PhysX/physx/source/physxcooking/src/convex/ConvexPolygonsBuilder.cpp \
  PhysX/physx/source/simulationcontroller/src/ScPhysics.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintProjectionManager.cpp \
  PhysX/physx/source/physxcooking/src/MeshCleaner.cpp \
  PhysX/physx/source/scenequery/src/SqPruningStructure.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsSimpleIslandManager.cpp \
  PhysX/physx/source/physx/src/buffering/ScbBase.cpp \
  PhysX/physx/source/scenequery/src/SqAABBPruner.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixThread.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixSync.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcNpMemBlockPool.cpp \
  PhysX/physx/source/task/src/TaskManager.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsCCD.cpp \
  PhysX/physx/source/scenequery/src/SqBucketPruner.cpp \
  PhysX/physx/source/scenequery/src/SqExtendedBucketPruner.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixFPU.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintProjectionTree.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsNphaseImplementationContext.cpp \
  PhysX/physx/source/physxcooking/src/CookingUtils.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixSList.cpp \
  PhysX/physx/source/foundation/src/PsAllocator.cpp \
  PhysX/physx/source/scenequery/src/SqAABBTree.cpp \
  PhysX/physx/source/scenequery/src/SqPruningPool.cpp \
  PhysX/physx/source/simulationcontroller/src/ScConstraintInteraction.cpp \
  PhysX/physx/source/simulationcontroller/src/ScShapeInteraction.cpp \
  PhysX/physx/source/simulationcontroller/src/ScElementSim.cpp \
  PhysX/physx/source/simulationcontroller/src/ScElementInteractionMarker.cpp \
  PhysX/physx/source/common/src/CmVisualization.cpp \
  PhysX/physx/source/physxcooking/src/convex/VolumeIntegration.cpp \
  PhysX/physx/source/physxcooking/src/Adjacencies.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyFeatherstoneArticulation.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyFeatherstoneForwardDynamic.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyFeatherstoneInverseDynamic.cpp \
  PhysX/physx/source/common/src/CmRadixSort.cpp \
  PhysX/physx/source/common/src/CmRadixSortBuffered.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsContactManager.cpp \
  PhysX/physx/source/physxcooking/src/EdgeList.cpp \
  PhysX/physx/source/common/src/CmRenderOutput.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsMaterialCombiner.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpAABBManager.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcNpBatch.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcNpThreadContext.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyThreadContext.cpp \
  PhysX/physx/source/physxcooking/src/convex/ConvexHullLib.cpp \
  PhysX/physx/source/physxcooking/src/convex/QuickHullConvexHullLib.cpp \
  PhysX/physx/source/physxcooking/src/convex/ConvexHullUtils.cpp \
  PhysX/physx/source/simulationcontroller/src/ScInteraction.cpp \
  PhysX/physx/source/scenequery/src/SqAABBTreeUpdateMap.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverControl.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverControlPF.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverConstraints.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverPFConstraints.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverPFConstraintsBlock.cpp \
  PhysX/physx/source/lowleveldynamics/src/DySolverConstraintsBlock.cpp \
  PhysX/physx/source/geomutils/src/ccd/GuCCDSweepConvexMesh.cpp \
  PhysX/physx/source/geomutils/src/hf/GuHeightField.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuBV32.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuBV32Build.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyContactPrep.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyTGSContactPrep.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcNpContactPrepShared.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhase.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhaseABP.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhaseShared.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyArticulation.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyTGSDynamics.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyTGSContactPrepBlock.cpp \
  PhysX/physx/source/scenequery/src/SqIncrementalAABBPrunerCore.cpp \
  PhysX/physx/snippets/snippetutils/SnippetUtils.cpp \
  PhysX/physx/source/lowlevel/api/src/px_globals.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuMidphaseRTree.cpp \
  PhysX/physx/source/simulationcontroller/src/ScTriggerInteraction.cpp \
  PhysX/physx/source/geomutils/src/pcm/GuPersistentContactManifold.cpp \
  PhysX/physx/source/physxcooking/src/mesh/RTreeCooking.cpp \
  PhysX/physx/source/simulationcontroller/src/ScSimulationController.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixAtomic.cpp \
  PhysX/physx/source/scenequery/src/SqIncrementalAABBTree.cpp \
  PhysX/physx/source/physxcooking/src/mesh/HeightFieldCooking.cpp \
  PhysX/physx/source/geomutils/src/GuAABBTreeBuild.cpp \
  PhysX/physx/source/physx/src/buffering/ScbAggregate.cpp \
  PhysX/physx/source/foundation/src/PsMathUtils.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyArticulationSIMD.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcNpCacheStreamPair.cpp \
  PhysX/physx/source/simulationcontroller/src/ScSimStats.cpp \
  PhysX/physx/source/physxcooking/src/Quantizer.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyFrictionCorrelation.cpp \
  PhysX/physx/source/geomutils/src/GuInternal.cpp \
  PhysX/physx/source/geomutils/src/GuBox.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhaseMBP.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuRTree.cpp \
  PhysX/physx/source/geomutils/src/GuSweepTests.cpp \
  PhysX/physx/source/geomutils/src/GuRaycastTests.cpp \
  PhysX/physx/source/geomutils/src/GuOverlapTests.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuOverlapTestsMesh.cpp \
  PhysX/physx/source/geomutils/src/hf/GuOverlapTestsHF.cpp \
  PhysX/physx/source/foundation/src/PsString.cpp \
  PhysX/physx/source/physx/src/buffering/ScbShape.cpp \
  PhysX/physx/source/scenequery/src/SqCompoundPruner.cpp \
  PhysX/physx/source/geomutils/src/GuGeometryUnion.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuRTreeQueries.cpp \
  PhysX/physx/source/geomutils/src/mesh/GuSweepsMesh.cpp \
  PhysX/physx/source/geomutils/src/GuSweepMTD.cpp \
  PhysX/physx/source/geomutils/src/hf/GuSweepsHF.cpp \
  PhysX/physx/source/geomutils/src/GuSweepSharedTests.cpp \
  PhysX/physx/source/geomutils/src/GuCCTSweepTests.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhaseSap.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpSAPTasks.cpp \
  PhysX/physx/source/geomutils/src/GuBounds.cpp \
  PhysX/physx/source/scenequery/src/SqCompoundPruningPool.cpp \
  PhysX/physx/source/foundation/src/unix/PsUnixPrintString.cpp \
  PhysX/physx/source/geomutils/src/gjk/GuGJKSimplex.cpp \
  PhysX/physx/source/physx/src/NpArticulationJoint.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyArticulationHelper.cpp \
  PhysX/physx/source/geomutils/src/common/GuBarycentricCoordinates.cpp \
  PhysX/physx/source/physx/src/NpArticulationJointReducedCoordinate.cpp \
  PhysX/physx/source/lowlevelaabb/src/BpBroadPhaseSapAux.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcContactMethodImpl.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyConstraintSetup.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyConstraintSetupBlock.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyArticulationContactPrep.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyArticulationContactPrepPF.cpp \
  PhysX/physx/source/geomutils/src/intersection/GuIntersection*.cpp \
  PhysX/physx/source/geomutils/src/pcm/GuPCMContact*.cpp \
  PhysX/physx/source/geomutils/src/contact/GuContact*.cpp \
  PhysX/physx/source/geomutils/src/sweep/GuSweep*.cpp \
  PhysX/physx/source/geomutils/src/distance/GuDistance*.cpp \
  PhysX/physx/source/geomutils/src/pcm/GuPCMShapeConvex.cpp \
  PhysX/physx/source/geomutils/src/convex/GuHillClimbing.cpp \
  PhysX/physx/source/geomutils/src/convex/GuConvexUtilsInternal.cpp \
  PhysX/physx/source/geomutils/src/convex/GuShapeConvex.cpp \
  PhysX/physx/source/geomutils/src/GuCapsule.cpp \
  PhysX/physx/source/geomutils/src/contact/GuFeatureCode.cpp \
  PhysX/physx/source/geomutils/src/common/GuSeparatingAxes.cpp \
  PhysX/physx/source/lowlevel/software/src/PxsDefaultMemoryManager.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyDynamics.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyContactPrep4.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyContactPrep4PF.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyConstraintPartition.cpp \
  PhysX/physx/source/geomutils/src/convex/GuConvexHelper.cpp \
  PhysX/physx/source/geomutils/src/ccd/GuCCDSweepPrimitives.cpp \
  PhysX/physx/source/geomutils/src/pcm/GuPCMTriangleContactGen.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyRigidBodyToSolverBody.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyContactPrepPF.cpp \
  PhysX/physx/source/geomutils/src/gjk/GuEPA.cpp \
  PhysX/physx/source/physxextensions/src/ExtTriangleMeshExt.cpp \
  PhysX/physx/source/physxextensions/src/ExtSimpleFactory.cpp \
  PhysX/physx/source/physxextensions/src/ExtRigidBodyExt.cpp \
  PhysX/physx/source/physxextensions/src/ExtDefaultCpuDispatcher.cpp \
  PhysX/physx/source/physxextensions/src/ExtDefaultSimulationFilterShader.cpp \
  PhysX/physx/source/physxextensions/src/ExtCpuWorkerThread.cpp \
  PhysX/physx/source/physx/src/NpReadCheck.cpp \
  PhysX/physx/source/foundation/src/PsAssert.cpp \
  PhysX/physx/source/physx/src/NpWriteCheck.cpp \
  PhysX/physx/source/physx/src/buffering/ScbActor.cpp \
  PhysX/physx/source/geomutils/src/convex/GuConvexSupportTable.cpp \
  PhysX/physx/source/physxextensions/src/ExtPxStringTable.cpp \
  PhysX/physx/source/lowleveldynamics/src/DyThresholdTable.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcMaterialMethodImpl.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcMaterialShape.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcMaterialMesh.cpp \
  PhysX/physx/source/lowlevel/common/src/pipeline/PxcMaterialHeightField.cpp \
  PhysX/physx/source/scenequery/src/SqBounds.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctBoxController.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctCapsuleController.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctCharacterController.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctCharacterControllerCallbacks.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctCharacterControllerManager.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctController.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctObstacleContext.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctSweptBox.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctSweptCapsule.cpp \
  PhysX/physx/source/physxcharacterkinematic/src/CctSweptVolume.cpp \
  PhysX/physx/source/physxextensions/src/ExtD6Joint.cpp \
  PhysX/physx/source/physxextensions/src/ExtD6JointCreate.cpp \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -c \
  && touch physx-timestamp
fi
if [ ! -f cut.o ]; then
  echo 'building cut...'
  emcc -O3 \
  cut.cc \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -c
fi
if [ ! -f march.o ]; then
  echo 'building march...'
  emcc -O3 \
  march.cc \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -c
fi
if [ ! -f occlusionCull.o ]; then
  echo 'building occlusionCull...'
  emcc -O3 \
  occlusionCull/occlusionCull.cc \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -c
fi
echo 'building main...'
# m = 64*1024; s = 200 * 1024 * 1024; Math.floor(s/m)*m;
emcc -s NO_EXIT_RUNTIME=1 -s TOTAL_MEMORY=209715200 -D__linux__ -s ALLOW_MEMORY_GROWTH=0 -O3 \
  -IPhysX/physx/include -IPhysX/pxshared/include \
  -IPhysX/physx/source/foundation/include \
  -IPhysX/physx/source/pvd/include \
  -IPhysX/physx/source/simulationcontroller/include -IPhysX/physx/source/lowlevel/api/include \
  -IPhysX/physx/source/geomutils/include \
  -IPhysX/physx/source/scenequery/include \
  -IPhysX/physx/source/lowleveldynamics/include \
  -IPhysX/physx/source/lowlevel/software/include \
  -IPhysX/physx/source/lowlevelaabb/include \
  -IPhysX/physx/source/lowlevel/common/include/pipeline \
  -IPhysX/physx/source/lowlevel/common/include/utils \
  -IPhysX/physx/source/lowlevel/common/include/collision \
  -IPhysX/physx/source/geomutils/src -IPhysX/physx/source/geomutils/src/common -IPhysX/physx/source/geomutils/src/mesh -IPhysX/physx/source/geomutils/src/hf -IPhysX/physx/source/geomutils/src/convex -IPhysX/physx/source/geomutils/src/gjk \
  -IPhysX/physx/source/common/src \
  -IPhysX/physx/source/physx/src/buffering \
  -IPhysX/physx/source/physx/src \
  -IPhysX/physx/source/physxcooking/src/convex \
  -IPhysX/physx/source/physxcooking/src/mesh \
  -IPhysX/physx/source/physxextensions/src/serialization/File \
  -IPhysX/physx/source/physxcooking/src \
  -IPhysX/physx/source/simulationcontroller/src \
  -IPhysX/physx/source/geomutils/src/intersection \
  -IPhysX//physx/source/geomutils/src/ccd \
  -IPhysX/physx/source/geomutils/src/contact \
  -IPhysX/physx/source/geomutils/src/pcm \
  -IPhysX/physx/source/geomutils/src/distance \
  -IPhysX/physx/source/geomutils/src/sweep \
  -IRectBinPack/include \
  -Iconcaveman \
  objectize.cc \
  vector.cc physics-base.cc physics.cc PathFinder.cc FastNoise.cpp AnimationSystem/AnimationSystem.cc \
  *.o \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -I. \
  -o bin/geometry.js
sed -Ei 's/geometry.wasm/bin\/geometry.wasm/g' bin/geometry.js
sed -Ei 's/scriptDirectory\+path/"\/"+path/g' bin/geometry.js
echo 'let accept, reject;const p = new Promise((a, r) => {  accept = a;  reject = r;});Module.postRun = () => {  accept();};Module.waitForLoad = () => p;run();export default Module;' >> bin/geometry.js
echo 'done building main'

echo 'building worker...'
# m = 64*1024; s = 50 * 1024 * 1024; Math.floor(s/m)*m;
emcc -s NO_EXIT_RUNTIME=1 -s TOTAL_MEMORY=52428800 -D__linux__ -s ALLOW_MEMORY_GROWTH=0 -O3 \
  -IPhysX/physx/include -IPhysX/pxshared/include \
  -IPhysX/physx/source/foundation/include \
  -IPhysX/physx/source/pvd/include \
  -IPhysX/physx/source/simulationcontroller/include -IPhysX/physx/source/lowlevel/api/include \
  -IPhysX/physx/source/geomutils/include \
  -IPhysX/physx/source/scenequery/include \
  -IPhysX/physx/source/lowleveldynamics/include \
  -IPhysX/physx/source/lowlevel/software/include \
  -IPhysX/physx/source/lowlevelaabb/include \
  -IPhysX/physx/source/lowlevel/common/include/pipeline \
  -IPhysX/physx/source/lowlevel/common/include/utils \
  -IPhysX/physx/source/lowlevel/common/include/collision \
  -IPhysX/physx/source/geomutils/src -IPhysX/physx/source/geomutils/src/common -IPhysX/physx/source/geomutils/src/mesh -IPhysX/physx/source/geomutils/src/hf -IPhysX/physx/source/geomutils/src/convex -IPhysX/physx/source/geomutils/src/gjk \
  -IPhysX/physx/source/common/src \
  -IPhysX/physx/source/physx/src/buffering \
  -IPhysX/physx/source/physx/src \
  -IPhysX/physx/source/physxcooking/src/convex \
  -IPhysX/physx/source/physxcooking/src/mesh \
  -IPhysX/physx/source/physxextensions/src/serialization/File \
  -IPhysX/physx/source/physxcooking/src \
  -IPhysX/physx/source/simulationcontroller/src \
  -IPhysX/physx/source/geomutils/src/intersection \
  -IPhysX//physx/source/geomutils/src/ccd \
  -IPhysX/physx/source/geomutils/src/contact \
  -IPhysX/physx/source/geomutils/src/pcm \
  -IPhysX/physx/source/geomutils/src/distance \
  -IPhysX/physx/source/geomutils/src/sweep \
  -IRectBinPack/include \
  -Iconcaveman \
  worker.cc \
  physics-base.cc \
  meshoptimizer/simplifier.cpp \
  *.o \
  -DNDEBUG -DPX_SIMD_DISABLED -DPX_EMSCRIPTEN=1 -DPX_COOKING \
  -I. \
  -o bin/app-wasm-worker.js
sed -Ei 's/app-wasm-worker.wasm/bin\/app-wasm-worker.wasm/g' bin/app-wasm-worker.js
sed -Ei 's/scriptDirectory\+path/"\/"+path/g' bin/app-wasm-worker.js
echo 'let accept, reject;const p = new Promise((a, r) => {  accept = a;  reject = r;});Module.postRun = () => {  accept();};Module.waitForLoad = () => p;run();export default Module;' >> bin/app-wasm-worker.js
echo 'done building worker'

# Prevent compile window auto close after error, to see the error details. https://askubuntu.com/a/20353/1012283
# exec $SHELL