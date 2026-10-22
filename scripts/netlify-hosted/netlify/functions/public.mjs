import handler from '../lib/release-handler.mjs';
import {adaptPublicHandler} from '../lib/adapter.mjs';
export default adaptPublicHandler(handler);
export const config={path:'/*',preferStatic:false};
