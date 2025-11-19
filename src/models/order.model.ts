export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  SNIPER = 'SNIPER',
}

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum DexType {
  RAYDIUM = 'RAYDIUM',
  METEORA = 'METEORA',
}

export interface Order {
  id: string;
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  status: OrderStatus;
  selectedDex?: DexType;
  raydiumQuote?: DexQuote;
  meteoraQuote?: DexQuote;
  routingDecision?: RoutingDecision;
  executedPrice?: number;
  amountOut?: number;
  txHash?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface DexQuote {
  dex: DexType;
  price: number;
  fee: number;
  effectivePrice: number;
  liquidity?: number;
  priceImpact?: number;
  timestamp: Date;
}

export interface RoutingDecision {
  selectedDex: DexType;
  reason: string;
  raydiumPrice: number;
  meteoraPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
}

export interface OrderSubmission {
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage?: number;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface WebSocketMessage {
  orderId: string;
  status: OrderStatus;
  message: string;
  data?: {
    txHash?: string;
    executedPrice?: number;
    amountOut?: number;
    selectedDex?: DexType;
    routingDecision?: RoutingDecision;
    error?: string;
  };
  timestamp: Date;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  executedPrice?: number;
  amountOut?: number;
  error?: string;
}
