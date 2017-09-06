import { createContext } from 'expression-expander';

export default class Context {
  constructor(targetRepo, templateRepo, properties) {
    this.ctx = createContext({
      keepUndefinedValues: true,
      leftMarker: '{{',
      rightMarker: '}}',
      markerRegexp: '{{([^}]+)}}'
    });

    this.ctx.properties = properties;

    Object.defineProperty(this, 'properties', {
      value: properties
    });

    Object.defineProperty(this, 'files', {
      value: new Map()
    });

    Object.defineProperty(this, 'targetRepo', {
      value: targetRepo
    });
    Object.defineProperty(this, 'templateRepo', {
      value: templateRepo,
      writable: true
    });
  }

  expand(...args) {
    return this.ctx.expand(...args);
  }

  addFile(file) {
    this.files.set(file.path, file);
  }
}
