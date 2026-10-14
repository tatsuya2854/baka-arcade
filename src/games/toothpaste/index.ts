import type { GameModule } from '../../core/types';
import { meta } from './meta';
// TODO: 担当エージェントが実装する（スタブ）
const mod: GameModule = { meta, start(ctx) { ctx.root.textContent = 'stub'; return { destroy() { ctx.root.textContent = ''; } }; } };
export default mod;
