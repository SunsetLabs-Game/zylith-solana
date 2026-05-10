// Custom stub for the 'util' Node.js module to satisfy ZK libraries in the browser
export const debuglog = () => () => {};
export const inspect = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// Add other commonly used util methods if needed
export const inherits = (ctor: any, superCtor: any) => {
  if (superCtor) {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  }
};

export default {
  debuglog,
  inspect,
  inherits,
};
