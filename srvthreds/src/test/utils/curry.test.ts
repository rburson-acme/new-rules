import { curryObj, Events } from '../../ts/thredlib';

describe('partial arg application', function () {
  test('should partially apply args', function () {
    const eventMaker = curryObj(Events.newEvent, {
      source: { id: 'test' },
      type: 'test',
      data: { content: { values: { test: 'test' } } },
    });
    const event = eventMaker({ data: { content: { values: { test: 'changed', newValue: 'hello' } } } });
    // the partially applied args should be retained
    expect(event.data.content.values.test).toBe('test');
    expect(event.data.content.values.newValue).toBe('hello');
  });
  test('should partially apply args multiple times', function () {
    const eventMaker = curryObj(Events.newEvent, {
      source: { id: 'test' },
      type: 'test',
      data: { content: { values: { test: 'test' } } },
    });
    const eventMaker2 = curryObj(eventMaker, {
      data: { content: { values: { newValue: 'hello', anotherValue: 'new' } } },
    });
    const event2 = eventMaker2({
      data: { content: { values: { test: 'nope', newValue: 'nope', anotherValue: 'nope', andAnother: 'yep' } } },
    });
    // the partially applied args should be retained
    expect(event2.data.content.values.test).toBe('test');
    expect(event2.data.content.values.newValue).toBe('hello');
    expect(event2.data.content.values.anotherValue).toBe('new');
    expect(event2.data.content.values.andAnother).toBe('yep');
  });
});
