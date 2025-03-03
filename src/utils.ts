export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const toBoolean = (value: any) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    let normalized = value.trim().toLowerCase();
    if (["1", "true", "t", "on"].includes(normalized)) return true;
    if (["0", "false", "f", "off"].includes(normalized)) return false;
  }
  return false;
};

export const normalizeNameString = (name: string) => {
  return name.replace(/\s+/g, "_").toLowerCase();
};

export const getTimestampHM = (t: number|null=null) => {
  const d = t ? new Date(t) : new Date();
  return d.toLocaleTimeString('pl-PL', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

export const getTimestampHMS = (t: number|null=null) => {
  const d = t ? new Date(t) : new Date();
  return d.toLocaleTimeString('pl-PL', { hour12: false });
};
