import { crud } from '@/lib/api/context';
import { pointRewards } from '@/lib/api/resources';

const handlers = crud.item(pointRewards);

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
