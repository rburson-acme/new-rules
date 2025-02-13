export function formatDateAndTime(time: number) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const amPm = hours >= 12 ? 'PM' : 'AM';

  const formattedTime = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${amPm}`;

  const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(
    2,
    '0',
  )} / ${String(date.getFullYear()).slice(-2)}`;

  return `${formattedTime} | ${formattedDate}`;
}
