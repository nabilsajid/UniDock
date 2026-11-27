import { crud } from '@/lib/api/context';
import { pointRewards } from '@/lib/api/resources';

const handlers = crud.collection(pointRewards);

export const GET = handlers.GET;
export const POST = handlers.POST;
