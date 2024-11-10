import { SettingType, SettingType_TrueSettings } from './enums.mjs';

export class SettingsManager {
  // class variables
  
  #button;
  #div;
  #localStorageKey;
  
  // helper functions
  
  static #parseSettings(settings, localStorageKeyExists) {
    if (!Array.isArray(settings)) {
      throw new Error(`settings not array: ${settings}`);
    }
    
    for (let i = 0; i < settings.length; i++) {
      let settingEntry = settings[i];
      let newSettingEntry = {};
      
      if (typeof settingEntry != 'object' || settingEntry == null) {
        throw new Error(`settings[${i}] type not object: ${typeof settingEntry}`);
      }
      
      if (typeof settingEntry.type != 'string') {
        throw new Error(`settings[${i}].type type not string: ${typeof settingEntry.type}`);
      }
      
      if (!(settingEntry.type in SettingType)) {
        throw new Error(`settings[${i}].type not in SettingType: ${settingEntry.type}`);
      }
      
      newSettingEntry.type = settingEntry.type;
      
      if (SettingType_TrueSettings.has(type)) {
        if (typeof settingEntry.name != 'string') {
          throw new Error(`settings[${i}].name type not string: ${typeof settingEntry.name}`);
        }
        
        newSettingEntry.name = settingEntry.name;
        
        if (typeof settingEntry.displayName != 'string' && settingEntry.displayName != null) {
          throw new Error(`settings[${i}].displayName type not string or null: ${typeof settingEntry.displayName}`);
        }
        
        newSettingEntry.displayName = settingEntry.displayName != null ? settingEntry.displayName : settingEntry.name;
        
        if (localStorageKeyExists) {
          if (typeof settingEntry.forceNonPersistent != 'boolean') {
            throw new Error(`settings[${i}].forceNonPersistent type not boolean: ${typeof settingEntry.forceNonPersistent}`);
          }
        
          newSettingEntry.forceNonPersistent = settingEntry.forceNonPersistent;
        }
        
        if (typeof settingEntry.visibility != 'function' && settingEntry.visibility != null) {
          throw new Error(`settings[${i}].visibility type not function or null: ${typeof settingEntry.visibility}`);
        }
        
        newSettingEntry.visibility = settingEntry.visibility != null ? settingEntry.visibility : null;
        
        if (typeof settingEntry.updateValidator != 'function' && settingEntry.updateValidator != null) {
          throw new Error(`settings[${i}].updateValidator type not function or null: ${typeof settingEntry.updateValidator}`);
        }
        
        newSettingEntry.updateValidator = settingEntry.updateValidator != null ? settingEntry.updateValidator : null;
        
        if (typeof settingEntry.onUpdate != 'function' && settingEntry.onUpdate != null) {
          throw new Error(`settings[${i}].onUpdate type not function or null: ${typeof settingEntry.onUpdate}`);
        }
        
        newSettingEntry.onUpdate = settingEntry.onUpdate != null ? settingEntry.onUpdate : null;
        
        switch (settingEntry.type) {
          case SettingType.BOOLEAN:
            if (typeof settingEntry.defaultValue != 'boolean') {
              throw new Error(`settings[${i}].defaultValue type not boolean: ${typeof settingEntry.defaultValue}`);
            }
            
            if (newSettingEntry.updateValidator != null) {
              let validationResults = newSettingEntry.updateValidator(settingEntry.defaultValue);
              
              if (validationResults != null) {
                let newValue = validationResults.newValue;
                
                if (newValue != null) {
                  if (typeof newValue != 'boolean') {
                    throw new Error(`Validator output not boolean: ${typeof newValue}`);
                  }
                }
                
                throw new Error(`settings[${i}].defaultValue does not pass validation function: ${newValue == null ? 'Generic Failure' : newValue}`);
              }
            }
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.ENUM_SELECT:
          case SettingType.ENUM_RADIO: {
            let values = new Map();
            let valueNames = [];
            
            if (!Array.isArray(settingEntry.values)) {
              throw new Error(`settings[${i}].values not array: ${settingEntry.values}`);
            }
            
            for (let j = 0; j < settingEntry.values; j++) {
              let valueEntry = settingEntry.values[j];
              
              if (typeof valueEntry != 'object' || valueEntry == null) {
                throw new Error(`settings[${i}].values[${j}] type not object: ${typeof valueEntry}`);
              }
              
              if (typeof valueEntry.name != 'string') {
                throw new Error(`settings[${i}].values[${j}].name type not string: ${typeof valueEntry.name}`);
              }
              
              if (typeof valueEntry.displayName != 'string' && valueEntry.displayName != null) {
                throw new Error(`settings[${i}].values[${j}].displayName type not string or null: ${typeof valueEntry.displayName}`);
              }
              
              if (values.has(valueEntry.name)) {
                throw new Error(`settings[${j}].values[${j}].name is duplicate: ${valueEntry.name}`);
              }
              
              values.set(valueEntry.name, valueEntry.displayName != null ? valueEntry.displayName : valueEntry.name);
              valueNames.push(valueEntry.name);
            }
            
            if (typeof valueEntry)
            break;
          }
          
          case SettingType.INTEGER:
            break;
          
          case SettingType.NUMBER:
            break;
          
          case SettingType.TEXT:
            break;
        }
      }
    }
    
    return;
  }
  
  // public functions
  
  constructor(opts) {
    if (!(opts.button instanceof HTMLElement)) {
      throw new Error('opts.button not instance of HTMLElement');
    }
    
    if (!(opts.div instanceof HTMLDivElement)) {
      throw new Error('opts.div not instance of HTMLElement');
    }
    
    if (typeof opts.localStorageKey != 'string' && opts.localStorageKey != null) {
      throw new Error('opts.localStorageKey is not string or null');
    }
    
    let settings = SettingsManager.#parseSettings(opts.settings, opts.localStorageKey != null);
    
    this.#button = opts.button;
    this.#div = opts.div;
    this.#localStorageKey = opts.localStorageKey;
  }
  
  settingsList() {
    // TODO
  }
  
  has(name) {
    // TODO
  }
  
  get(name) {
    // TODO
  }
  
  set(name, value) {
    // TODO
  }
  
  getSettingsVisibility() {
    // TODO
  }
  
  setSettingsVisibility(visibility) {
    // TODO
  }
}
