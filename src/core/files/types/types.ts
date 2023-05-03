export interface FileLink {
  id: string;
  url: string;
  fileName?: string;
}

export interface FileWithSensorProblem {
  fileId: string;
  sensor: {
    sensorId: string;
    problem: string;
  };
}
