import { Machine } from '../../ts/thredlib/index.js';
import { MachineContext } from '../../ts/thredlib/index.js';

type InputEventType = { material: 'ice' | 'fire' };
type MachineContextValueType = string;

const machine = Machine.createMachine<InputEventType, MachineContextValueType>(
  {
    initialStateName: 'cold',
    states: [
      {
        name: 'cold',
        transition: ({ event, machineContext }) => {
          machineContext.value = 'cold';
          return event.material === 'fire' ? 'warm' : undefined;
        },
      },
      {
        name: 'warm',
        transition: ({ event, machineContext }) => {
          machineContext.value = 'warm';
          return event.material === 'fire' ? 'hot' : 'cold';
        },
      },
      {
        name: 'hot',
        transition: ({ event, machineContext }) => {
          machineContext.value = 'hot';
          return event.material === 'ice' ? 'warm' : null;
        },
      },
    ],
  },
  { value: '' } as MachineContext<MachineContextValueType>,
);

describe('machine', function () {
  test('shouldHaveIntialState', function () {
    expect(machine.currentState.name).toBe('cold');
  });
  test('shouldChangeState', function () {
    machine.apply({ material: 'fire' });
    expect(machine.machineContext.value).toBe('cold');
    expect(machine.currentState.name).toBe('warm');
  });
  test('shouldChangeState', function () {
    machine.apply({ material: 'fire' });
    expect(machine.machineContext.value).toBe('warm');
    expect(machine.currentState.name).toBe('hot');
  });
  test('shouldNotChangeState', function () {
    machine.apply({ material: 'fire' });
    expect(machine.machineContext.value).toBe('hot');
    expect(machine.currentState.name).toBe('hot');
  });
  test('shouldChangeState', function () {
    machine.apply({ material: 'ice' });
    expect(machine.machineContext.value).toBe('hot');
    expect(machine.currentState.name).not.toBe('hot');
    expect(machine.currentState.name).toBe('warm');
  });
});
