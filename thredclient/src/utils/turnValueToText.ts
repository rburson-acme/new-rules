export function turnValueToText(value: string | string[] | boolean) {
  const isValueString = typeof value === 'string';
  const isValueBoolean = typeof value === 'boolean';
  const isValueStringArray = Array.isArray(value) && value.every(item => typeof item === 'string');
  if (isValueString) {
    return value;
  }
  if (isValueStringArray) {
    return value.join(', ');
  }
  if (isValueBoolean) {
    return value ? 'Yes' : 'No';
  } else return 'Invalid String';
}
