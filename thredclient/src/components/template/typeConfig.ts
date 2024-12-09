// which 'attrs' should we traverse and transform
export type TypeConfig = Record<string, { attrsToTransform: string[] }>;
export const typeConfig = {
  group: { attrsToTransform: ['items'] },
  input: { attrsToTransform: [] },
  value: { attrsToTransform: [] },
};
