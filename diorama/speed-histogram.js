// this function maps the speed histogram to a position, integrated up to the given timestamp
const mapTime = (speedHistogram = new SpeedHistogram, time = 0) => {
  const {elements} = speedHistogram;
  const totalDistance = speedHistogram.totalDistance();
  // const totalDuration = speedHistogram.totalDuration();
  // const totalDistance = this.totalDistance();
  let currentTime = 0;
  let currentDistance = 0;
  for (let i = 0; i < elements.length; i++) {
    const {speed, duration} = elements[i];
    if (time < currentTime + duration) {
      currentDistance += speed * (time - currentTime);
      break;
    } else {
      currentTime += duration;
      currentDistance += speed * duration;
    }
  }
  return currentDistance / totalDistance;
};
// a container class that stores instantaneous speed changes over time
export class SpeedHistogram {
  constructor() {
    this.elements = [];
  }

  add(speed, duration) {
    this.elements.push({speed, duration});
  }

  totalDuration() {
    const {elements} = this;
    let totalDuration = 0;
    for (let i = 0; i < elements.length; i++) {
      totalDuration += elements[i].duration;
    }
    return totalDuration;
  }

  totalDistance() {
    const {elements} = this;
    // const totalDuration = this.totalDuration();
    let totalDistance = 0;
    for (let i = 0; i < elements.length; i++) {
      totalDistance += elements[i].speed * elements[i].duration;
    }
    return totalDistance;
  }

  fromArray(elements) {
    this.elements = elements;
    return this;
  }

  toArray(frameRate = 60, startTime = 0, endTime = this.totalDuration()) {
    // const {elements} = this;
    // const totalDuration = this.totalDuration();
    // const totalDistance = this.totalDistance();
    const startTimeSeconds = startTime / 1000;
    const endTimeSeconds = endTime / 1000;
    // const startPosition = mapTime(this, startTime);
    // const endPosition = mapTime(this, endTime);
    const frameCount = Math.ceil(endTimeSeconds - startTimeSeconds) * frameRate;
    const positions = [];
    for (let i = 0; i < frameCount; i++) {
      const time = startTimeSeconds + i / frameRate;
      const position = mapTime(this, time * 1000);
      // const normalizedPosition = position / totalDistance;
      positions.push(position);
    }
    return positions;
  }
}