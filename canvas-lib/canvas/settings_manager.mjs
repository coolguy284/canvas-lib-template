import { SettingEnumUIType, SettingType, SettingType_TrueSettings } from './enums.mjs';
import { isEnum } from '../misc/enum.mjs';

export class SettingsManager {
  // class variables
  
  #button;
  #div;
  #localStorageKey;
  
  // helper functions
  
  static #validateBool(value, updateValidator, allowValueCoercion) {
    if (typeof value != 'boolean') {
      throw new Error(`value type not boolean: ${typeof value}`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value);
      
      if (validationResults != null) {
        let newValue = validationResults.newValue;
        
        if (newValue != null) {
          if (typeof newValue != 'boolean') {
            throw new Error(`Validator output not boolean: ${typeof newValue}`);
          }
        }
        
        if (allowValueCoercion) {
          return newValue;
        } else {
          throw new Error(`value does not pass validation function: ${newValue == null ? 'Generic Failure' : 'Converted to: ' + newValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateEnum(value, enumValuesSet, updateValidator, allowValueCoercion) {
    if (typeof value != 'string') {
      throw new Error(`settings[${i}].defaultValue type not string: ${typeof value}`);
    }
    
    if (!enumValuesSet.has(value)) {
      throw new Error(`settings[${i}].defaultValue not present in enum: ${value}`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value);
      
      if (validationResults != null) {
        let newValue = validationResults.newValue;
        
        if (newValue != null) {
          if (typeof newValue != 'string') {
            throw new Error(`Validator output not string: ${typeof newValue}`);
          }
          
          if (!enumValuesSet.has(newValue)) {
            throw new Error(`Validator output not present in enum: ${newValue}`);
          }
        }
        
        if (allowValueCoercion) {
          return newValue;
        } else {
          throw new Error(`value does not pass validation function: ${newValue == null ? 'Generic Failure' : 'Converted to: ' + newValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateInt(value, min, max, updateValidator, allowValueCoercion) {
    if (!Number.isSafeInteger(value)) {
      // TODO
    }
    
    // TODO
  }
  
  static #validateText(value, updateValidator, allowValueCoercion) {
    if (typeof value != 'string') {
      throw new Error(`value type not string: ${typeof value}`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value);
      
      if (validationResults != null) {
        let newValue = validationResults.newValue;
        
        if (newValue != null) {
          if (typeof newValue != 'string') {
            throw new Error(`Validator output not string: ${typeof newValue}`);
          }
        }
        
        if (allowValueCoercion) {
          return newValue;
        } else {
          throw new Error(`value does not pass validation function: ${newValue == null ? 'Generic Failure' : 'Converted to: ' + newValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #parseSettings(settings, localStorageKeyExists) {
    if (!Array.isArray(settings)) {
      throw new Error(`settings not array: ${settings}`);
    }
    
    let settingsMap = new Map();
    let settingsUiPropertiesMap = new Map();
    let uiEntries = [];
    
    for (let i = 0; i < settings.length; i++) {
      let settingEntry = settings[i];
      let newSettingEntry = {};
      let settingUiProperties = {};
      
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
        
        if (settingsMap.has(settingEntry.name)) {
          throw new Error(`settings[${i}].name is duplicate: ${settingEntry.name}`);
        }
        
        if (typeof settingEntry.displayName != 'string' && settingEntry.displayName != null) {
          throw new Error(`settings[${i}].displayName type not string or null: ${typeof settingEntry.displayName}`);
        }
        
        settingUiProperties.displayName = settingEntry.displayName != null ? settingEntry.displayName : settingEntry.name;
        
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
            SettingsManager.#validateBool(settingEntry.defaultValue, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.ENUM: {
            let values = [];
            let valuesSet = new Set();
            let valueNames = new Map();
            
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
                throw new Error(`settings[${i}].values[${j}].name is duplicate: ${valueEntry.name}`);
              }
              
              values.push(valueEntry.name);
              valuesSet.add(valueEntry.name);
              valueNames.set(valueEntry.name, valueEntry.displayName != null ? valueEntry.displayName : valueEntry.name);
            }
            
            if (typeof settingEntry.valuesReference != 'object' && settingEntry.valuesReference != null) {
              throw new Error(`settings[${i}].valuesReference type not object or null: ${typeof settingEntry.valuesReference}`);
            }
            
            if (settingEntry.valuesReference != null) {
              if (!isEnum(settingEntry.valuesReference.enum)) {
                throw new Error(`settings[${i}].valuesReference.enum is not an enum: ${settingEntry.valuesReference.enum}`);
              }
              
              if (typeof settingEntry.valuesReference.requireSameOrderAsEnum != 'boolean') {
                throw new Error(`settings[${i}].valuesReference.requireSameOrderAsEnum type not boolean: ${typeof settingEntry.valuesReference.requireSameOrderAsEnum}`);
              }
              
              const enumValue = settingEntry.valuesReference.enum;
              const requireSameOrderAsEnum = settingEntry.valuesReference.requireSameOrderAsEnum;
              let enumKeys = Object.keys(enumValue);
              let enumKeysSet = new Set(enumKeys);
              
              for (let value of values) {
                if (!enumKeysSet.has(value)) {
                  throw new Error(`settings[${i}].values contains extra name not in enum: ${value}`);
                }
              }
              
              for (let enumValue of enumKeysSet) {
                if (!valuesSet.has(enumValue)) {
                  throw new Error(`settings[${i}].values missing name present in enum: ${enumValue}`);
                }
              }
              
              if (requireSameOrderAsEnum) {
                for (let j = 0; j < values.length; j++) {
                  if (values[j] != enumKeys[j]) {
                    throw new Error(`settings[${i}].values not in same order as enum: settings[${i}].values[${j}].name (${values[j]}) != Object.keys(settings[${i}].valuesReference.enum)[${j}] (${enumKeys[j]})`);
                  }
                }
              }
            }
            
            newSettingEntry.values = values;
            newSettingEntry.valuesSet = valuesSet;
            settingUiProperties.valueNames = valueNames;
            
            if (typeof settingEntry.uiMode != 'string') {
              throw new Error(`settings[${i}].uiMode type not string: ${typeof settingEntry.uiMode}`);
            }
            
            if (!(settingEntry.uiMode in SettingEnumUIType)) {
              throw new Error(`settings[${i}].uiMode not in SettingEnumUIType: ${settingEntry.uiMode}`);
            }
            
            SettingsManager.#validateEnum(settingEntry.defaultValue, valuesSet, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          }
          
          case SettingType.INTEGER:
            if (!Number.isSafeInteger(settingEntry.min) && settingEntry.min != null) {
              throw new Error(`settings[${i}].min not integer or null: ${settingEntry.min}`);
            }
            
            if (settingEntry.min != null) {
              newSettingEntry.min = settingEntry.min;
            } else {
              newSettingEntry.min = Number.MIN_SAFE_INTEGER;
            }
            
            if (!Number.isSafeInteger(settingEntry.max) && settingEntry.max != null) {
              throw new Error(`settings[${i}].max not integer or null: ${settingEntry.max}`);
            }
            
            if (settingEntry.max != null) {
              newSettingEntry.max = settingEntry.max;
            } else {
              newSettingEntry.max = Number.MAX_SAFE_INTEGER;
            }
            
            if (typeof settingEntry.sliderPresent != 'boolean') {
              throw new Error(`settings[${i}].sliderPresent not boolean: ${typeof settingEntry.sliderPresent}`);
            }
            
            settingUiProperties.sliderPresent = settingEntry.sliderPresent;
            
            if (settingUiProperties.sliderPresent) {
              // TODO
            }
            
            // TODO
            
            SettingsManager.#validateInt(settingEntry.defaultValue, newSettingEntry.min, newSettingEntry.max, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.NUMBER:
            // TODO
            break;
          
          case SettingType.TEXT:
            SettingsManager.#validateText(settingEntry.defaultValue, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          default:
            throw new Error('default case not possible, all options accounted for');
        }
        
        settingsMap.set(settingEntry.name, newSettingEntry);
        settingsUiPropertiesMap.set(settingEntry.name, settingUiProperties);
        uiEntries.push({
          type: null,
          name: settingEntry.name,
        });
      } else {
        switch (settingEntry.type) {
          case SettingType.HEADER:
          case SettingType.INFO_TEXT:
            // TODO
            break;
          
          case SettingType.BUTTON:
            // TODO
            break;
          
          default:
            throw new Error('default case not possible, all options accounted for');
        }
      }
    }
    
    return {
      settingsMap,
      settingsUiPropertiesMap,
      uiEntries,
    };
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
    
    let { settingsMap, uiEntries } = SettingsManager.#parseSettings(opts.settings, opts.localStorageKey != null);
    
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
