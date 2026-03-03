// /src/app/neon-rift/riftMachine.ts
/**
 * XState machine for Rift transitions
 * Manages: STABLE → WARNING → ACTIVE → COOLDOWN cycle
 */
import { setup, assign } from 'xstate';

export type RiftMutationType = 'GRAVITY_FLIP' | 'REVERSE_SCROLL' | 'PHASE_SHIFT';

interface RiftContext {
  currentMutation: RiftMutationType | null;
  previousMutation: RiftMutationType | null;
  warningDuration: number;
  activeDuration: number;
  cooldownDuration: number;
}

export const riftMachine = setup({
  types: {
    context: {} as RiftContext,
    events: {} as 
      | { type: 'TRIGGER_RIFT' }
      | { type: 'WARNING_COMPLETE' }
      | { type: 'RIFT_COMPLETE' }
      | { type: 'COOLDOWN_COMPLETE' }
      | { type: 'FORCE_END' }
  }
}).createMachine({
  id: 'riftMachine',
  initial: 'stable',
  context: {
    currentMutation: null,
    previousMutation: null,
    warningDuration: 1500, // 1.5s warning
    activeDuration: 15000, // 15s active
    cooldownDuration: 3000, // 3s cooldown
  },
  states: {
    stable: {
      on: {
        TRIGGER_RIFT: {
          target: 'warning',
          actions: assign({
            currentMutation: ({ context }) => {
              // Select random mutation excluding previous
              const mutations: RiftMutationType[] = ['GRAVITY_FLIP', 'REVERSE_SCROLL', 'PHASE_SHIFT'];
              const available = mutations.filter((m: RiftMutationType) => m !== context.previousMutation);
              return available[Math.floor(Math.random() * available.length)] || null;
            }
          })
        }
      }
    },
    warning: {
      after: {
        1500: 'active' // warningDuration
      },
      on: {
        WARNING_COMPLETE: 'active',
        FORCE_END: 'stable'
      }
    },
    active: {
      after: {
        15000: 'cooldown' // activeDuration
      },
      on: {
        RIFT_COMPLETE: 'cooldown',
        FORCE_END: 'stable'
      }
    },
    cooldown: {
      entry: assign({
        previousMutation: ({ context }) => context.currentMutation,
        currentMutation: () => null
      }),
      after: {
        3000: 'stable' // cooldownDuration
      },
      on: {
        COOLDOWN_COMPLETE: 'stable',
        FORCE_END: 'stable'
      }
    }
  }
});
