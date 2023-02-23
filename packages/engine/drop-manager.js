import * as THREE from 'three';
// import metaversefile from 'metaversefile';
import generateStats from './procgen/stats.js';
import {getVoucherFromServer} from './voucherHelpers'

const r = () => -1 + Math.random() * 2;

class DropManager extends EventTarget {
  constructor() {
    super();

    this.claims = [];
    this.spawns = [];
  }

  async createDropApp({
    start_url,
    components = [],
    type = 'minor', // 'minor', 'major', 'key'
    position,
    quaternion,
    scale,
    velocity = new THREE.Vector3(r(), 1 + Math.random(), r())
      .normalize()
      .multiplyScalar(5),
    angularVelocity = new THREE.Vector3(0, 0.001, 0),
    voucher = 'fakeVoucher', // XXX should really throw if no voucher
  }) {

    let serverDrop = false;
    if (voucher === 'fakeVoucher') {
        voucher = await getVoucherFromServer(start_url);
        serverDrop = true;
        components = [...components, {
            key: 'voucher',
            value: voucher
        }]
    } else if (voucher === 'hadVoucher') {
        serverDrop = false;
    }

    const dropComponent = {
      key: 'drop',
      value: {
        type,
        serverDrop,
        voucher,
        velocity: velocity.toArray(),
        angularVelocity: angularVelocity.toArray(),
      },
    };
    components.push(dropComponent);
    
    const trackedApp = metaversefile.addTrackedApp(
      start_url,
      position,
      quaternion,
      scale,
      components
    );
    return trackedApp;
  }

  addClaim(name, type, serverDrop, contentId, voucher) {
    const result = generateStats(contentId);
    const {/* art, */stats} = result;
    const {level} = stats;
    const start_url = contentId;
    const claim = {
      name,
      type,
      serverDrop,
      start_url,
      level,
      voucher,
    };
    this.claims.push(claim);

    this.dispatchEvent(new MessageEvent('claimschange', {
      data: {
        claims: this.claims,
        addedClaim: claim
      },
    }));
  }

  /* addSpawnToBackpack({name, contentId, uuid}) {
    // console.log("spawn pick up", app)
    const spawn = {
      name,
      start_url: contentId, 
      uuid
    };
    this.spawns.push(spawn);
    this.dispatchEvent(new MessageEvent('spawnschange', {
      data: {
        spawns: this.spawns
      },
    }));
  }

  removeSpawnFromBackpack({uuid}) {
    const newSpawns = this.spawns.filter((each) => each.uuid !== uuid)
    this.spawns = newSpawns;
    this.dispatchEvent(new MessageEvent('spawnschange', {
      data: {
        spawns: newSpawns
      },
    }));
  } */

  pickupApp(app) {
    this.addClaim(app.name, app.type, app.getComponent('drop').serverDrop, app.contentId, app.getComponent('voucher'));
  }

  removeClaim(claimedDrop) {
    const newClaims = this.claims.filter((each) => JSON.stringify(each.voucher) !== JSON.stringify(claimedDrop.voucher))
    this.claims = newClaims;
    this.dispatchEvent(new MessageEvent('claimschange', {
      data: {
        claims: newClaims,
      },
    }));
  }

  claimVoucher(contractAddress, tokenId, voucher) {
    // ui handles this
    this.dispatchEvent(new MessageEvent('claimvoucher', {
      data: {
        contractAddress,
        tokenId,
        voucher,
      },
    }));
  }
}
const dropManager = new DropManager();

export default dropManager;