export interface Device {
  id: string;
  brand: string;
  name: string;
  os: string;
  resolution: string;
  aspectRatio: string;
  screenSize: string;
  category: 'tablet' | 'phone';
  popular: boolean;
}

export const tabletModels: Device[] = [
  {
    id: 't1',
    brand: 'Apple',
    name: 'iPad Pro 12.9 (2022)',
    os: 'iPadOS',
    resolution: '2732 x 2048',
    aspectRatio: '4:3',
    screenSize: '12.9 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't2',
    brand: 'Apple',
    name: 'iPad Pro 11 (2022)',
    os: 'iPadOS',
    resolution: '2388 x 1668',
    aspectRatio: '4:3',
    screenSize: '11 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't3',
    brand: 'Apple',
    name: 'iPad Air (2022)',
    os: 'iPadOS',
    resolution: '2360 x 1640',
    aspectRatio: '4:3',
    screenSize: '10.9 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't4',
    brand: 'Samsung',
    name: 'Galaxy Tab S9 Ultra',
    os: 'Android',
    resolution: '2960 x 1848',
    aspectRatio: '16:10',
    screenSize: '14.6 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't5',
    brand: 'Samsung',
    name: 'Galaxy Tab S9+',
    os: 'Android',
    resolution: '2800 x 1752',
    aspectRatio: '16:10',
    screenSize: '12.4 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't6',
    brand: 'Samsung',
    name: 'Galaxy Tab S9',
    os: 'Android',
    resolution: '2560 x 1600',
    aspectRatio: '16:10',
    screenSize: '11 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't7',
    brand: 'Xiaomi',
    name: 'Pad 6 Pro',
    os: 'Android',
    resolution: '2880 x 1800',
    aspectRatio: '16:10',
    screenSize: '11 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't8',
    brand: 'Xiaomi',
    name: 'Pad 6',
    os: 'Android',
    resolution: '2880 x 1800',
    aspectRatio: '16:10',
    screenSize: '11 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't9',
    brand: 'Huawei',
    name: 'MatePad Pro 13.2',
    os: 'HarmonyOS',
    resolution: '2880 x 1920',
    aspectRatio: '3:2',
    screenSize: '13.2 英寸',
    category: 'tablet',
    popular: true
  },
  {
    id: 't10',
    brand: 'Huawei',
    name: 'MatePad Pro 12.2',
    os: 'HarmonyOS',
    resolution: '2560 x 1600',
    aspectRatio: '16:10',
    screenSize: '12.2 英寸',
    category: 'tablet',
    popular: false
  }
];

export const phoneModels: Device[] = [
  {
    id: 'p1',
    brand: 'Apple',
    name: 'iPhone 15 Pro Max',
    os: 'iOS',
    resolution: '2796 x 1290',
    aspectRatio: '19.5:9',
    screenSize: '6.7 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p2',
    brand: 'Apple',
    name: 'iPhone 15 Pro',
    os: 'iOS',
    resolution: '2556 x 1179',
    aspectRatio: '19.5:9',
    screenSize: '6.1 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p3',
    brand: 'Apple',
    name: 'iPhone 15',
    os: 'iOS',
    resolution: '2556 x 1179',
    aspectRatio: '19.5:9',
    screenSize: '6.1 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p4',
    brand: 'Samsung',
    name: 'Galaxy S24 Ultra',
    os: 'Android',
    resolution: '3120 x 1440',
    aspectRatio: '19.5:9',
    screenSize: '6.8 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p5',
    brand: 'Samsung',
    name: 'Galaxy S24+',
    os: 'Android',
    resolution: '3120 x 1440',
    aspectRatio: '19.5:9',
    screenSize: '6.7 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p6',
    brand: 'Samsung',
    name: 'Galaxy S24',
    os: 'Android',
    resolution: '2340 x 1080',
    aspectRatio: '19.5:9',
    screenSize: '6.2 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p7',
    brand: 'Xiaomi',
    name: 'Xiaomi 14 Ultra',
    os: 'Android',
    resolution: '3200 x 1440',
    aspectRatio: '20:9',
    screenSize: '6.73 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p8',
    brand: 'Xiaomi',
    name: 'Xiaomi 14 Pro',
    os: 'Android',
    resolution: '3200 x 1440',
    aspectRatio: '20:9',
    screenSize: '6.73 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p9',
    brand: 'Huawei',
    name: 'Mate 60 Pro+',
    os: 'HarmonyOS',
    resolution: '2720 x 1260',
    aspectRatio: '19.5:9',
    screenSize: '6.82 英寸',
    category: 'phone',
    popular: true
  },
  {
    id: 'p10',
    brand: 'Huawei',
    name: 'P60 Pro',
    os: 'HarmonyOS',
    resolution: '2700 x 1220',
    aspectRatio: '19.5:9',
    screenSize: '6.67 英寸',
    category: 'phone',
    popular: true
  }
];

