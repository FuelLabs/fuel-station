export const shortenAddress = (address: string, chars: number = 4): string => {
  if (!address || address.length < chars * 2 + 2) return address;
  const prefix = address.slice(0, chars + 2);
  const suffix = address.slice(-chars);
  return `${prefix}...${suffix}`;
};
