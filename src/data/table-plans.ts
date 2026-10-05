// Image-space hotspots only. Capacity, identity and booking rules stay in the live catalogue.
export type TablePlanImage = {
  path: string;
  width: number;
  height: number;
  hotspots: Record<string, readonly [number, number]>;
};

export const tablePlanImages: Record<string, TablePlanImage> = {
  "floor-1": {
    path: "/images/restaurant/table-plans/floor-1.png", width: 1448, height: 1086,
    hotspots: {
      "T1-B01": [30.3, 14], "T1-B02": [50.4, 14], "T1-B03": [70, 16.7],
      "T1-B04": [31, 33.5], "T1-B05": [50.3, 33.5], "T1-B06": [71.4, 33.5],
      "T1-B07": [33.7, 52], "T1-B08": [68.1, 52],
    },
  },
  "floor-2": {
    path: "/images/restaurant/table-plans/floor-2.png", width: 1671, height: 941,
    hotspots: {
      "T2-B01": [21, 60], "T2-B02": [26.8, 20], "T2-B03": [42.2, 20],
      "T2-B04": [25.3, 38], "T2-B05": [49, 40], "T2-B06": [65.6, 20],
      "T2-B07": [65.8, 43], "T2-B08": [45.4, 59],
    },
  },
  "floor-3": {
    path: "/images/restaurant/table-plans/floor-3.png", width: 1292, height: 1218,
    hotspots: {
      "T3-B01": [32, 66], "T3-B02": [55.9, 66], "T3-B03": [72.7, 44],
      "T3-B04": [29.7, 24], "T3-B05": [45, 43], "T3-B06": [70.9, 23],
    },
  },
};
