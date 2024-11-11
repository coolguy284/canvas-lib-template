import { SettingEnumUIType, SettingType, SettingType_TrueSettings } from './enums.mjs';
import { removeAllNodes } from '../misc/dom_tools.mjs';
import { isEnum } from '../misc/enum.mjs';

export class SettingsManager {
  // class variables
  
  #button;
  #div;
  #localStorageKey;
  #settingsMap;
  
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
            throw new Error(`validator output not boolean: ${typeof newValue}`);
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
            throw new Error(`validator output not string: ${typeof newValue}`);
          }
          
          if (!enumValuesSet.has(newValue)) {
            throw new Error(`validator output not present in enum: ${newValue}`);
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
      throw new Error(`value not integer: ${value}`);
    }
    
    if (value < min) {
      throw new Error(`value (${value}) < min (${min})`);
    }
    
    if (value > max) {
      throw new Error(`value (${value}) > max (${max})`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value);
      
      if (validationResults != null) {
        let newValue = validationResults.newValue;
        
        if (newValue != null) {
          if (!Number.isSafeInteger(newValue)) {
            throw new Error(`validator output not integer: ${newValue}`);
          }
          
          if (newValue < min) {
            throw new Error(`validator output (${newValue}) < min (${min})`);
          }
          
          if (newValue > max) {
            throw new Error(`validator output (${newValue}) > max (${max})`);
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
  
  static #validateNumber(value /* TODO */, updateValidator, allowValueCoercion) {
    // TODO
  }
  
  static #validateText(value, multiline, updateValidator, allowValueCoercion) {
    if (typeof value != 'string') {
      throw new Error(`value type not string: ${typeof value}`);
    }
    
    if (!multiline) {
      if (value.includes('\n') || value.includes('\r')) {
        throw new Error(`text not multiline but value includes newlines: ${value}`);
      }
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value);
      
      if (validationResults != null) {
        let newValue = validationResults.newValue;
        
        if (newValue != null) {
          if (typeof newValue != 'string') {
            throw new Error(`validator output not string: ${typeof newValue}`);
          }
          
          if (!multiline) {
            if (newValue.includes('\n') || newValue.includes('\r')) {
              throw new Error(`text not multiline but validator output includes newlines: ${newValue}`);
            }
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
        
        settingUiProperties.visibility = settingEntry.visibility != null ? settingEntry.visibility : null;
        
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
              if (typeof settingEntry.sliderMapping != 'object' && settingEntry.sliderMapping != null) {
                throw new Error(`settings[${i}].sliderMapping not object or null: ${typeof settingEntry.sliderMapping}`);
              }
              
              if (settingEntry.sliderMapping != null) {
                if (typeof settingEntry.sliderMapping.sliderToValue != 'function') {
                  throw new Error(`settings[${i}].sliderMapping.sliderToValue not function: ${typeof settingEntry.sliderMapping.sliderToValue}`);
                }
                
                if (typeof settingEntry.sliderMapping.valueToSlider != 'function') {
                  throw new Error(`settings[${i}].sliderMapping.valueToSlider not function: ${typeof settingEntry.sliderMapping.valueToSlider}`);
                }
                
                if (!Number.isSafeInteger(settingEntry.sliderMapping.sliderIncrements)) {
                  throw new Error(`settings[${i}].sliderMapping.sliderIncrements not integer: ${settingEntry.sliderMapping.sliderIncrements}`);
                }
                
                if (settingEntry.sliderMapping.sliderIncrements <= 0) {
                  throw new Error(`settings[${i}].sliderMapping.sliderIncrements must be greater than zero: ${settingEntry.sliderMapping.sliderIncrements}`);
                }
                
                settingUiProperties.sliderMapping = {
                  sliderToValue: settingEntry.sliderMapping.sliderToValue,
                  valueToSlider: settingEntry.sliderMapping.valueToSlider,
                  sliderIncrements: settingEntry.sliderMapping.sliderIncrements,
                };
              } else {
                settingUiProperties.sliderMapping = null;
              }
              
              if (!Number.isSafeInteger(settingEntry.sliderMin) && settingEntry.sliderMin != null) {
                throw new Error(`settings[${i}].sliderMin not integer or null: ${settingEntry.sliderMin}`);
              }
              
              if (!Number.isSafeInteger(settingEntry.sliderMax) && settingEntry.sliderMax != null) {
                throw new Error(`settings[${i}].sliderMax not integer or null: ${settingEntry.sliderMax}`);
              }
              
              if (settingUiProperties.sliderMapping != null) {
                if (settingEntry.sliderMin != null) {
                  throw new Error(`settings[${i}].sliderMapping set but settings[${i}].sliderMin not null`);
                }
                
                if (settingEntry.sliderMax != null) {
                  throw new Error(`settings[${i}].sliderMapping set but settings[${i}].sliderMax not null`);
                }
                
                settingUiProperties.sliderMin = null;
                settingUiProperties.sliderMax = null;
              } else {
                if (settingEntry.sliderMin == null && settingEntry.min == null) {
                  throw new Error(`both settings[${i}].sliderMin and settings[${i}].min not specified and settings[${i}].sliderMapping not set`);
                }
                
                if (settingEntry.sliderMax == null && settingEntry.max == null) {
                  throw new Error(`both settings[${i}].sliderMax and settings[${i}].max not specified and settings[${i}].sliderMapping not set`);
                }
                
                settingUiProperties.sliderMin = settingEntry.sliderMin;
                settingUiProperties.sliderMax = settingEntry.sliderMax;
              }
              
              if (typeof settingEntry.largeSliderAndNumberBox != 'boolean') {
                throw new Error(`settings[${i}].largeSliderAndNumberBox not boolean: ${settingEntry.largeSliderAndNumberBox}`);
              }
              
              settingUiProperties.largeSliderAndNumberBox = settingEntry.largeSliderAndNumberBox;
              
              if (typeof settingEntry.sliderDraggingIsUpdate != 'boolean') {
                throw new Error(`settings[${i}].sliderDraggingIsUpdate not boolean: ${settingEntry.sliderDraggingIsUpdate}`);
              }
              
              settingUiProperties.sliderDraggingIsUpdate = settingEntry.sliderDraggingIsUpdate;
            }
            
            SettingsManager.#validateInt(settingEntry.defaultValue, newSettingEntry.min, newSettingEntry.max, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.NUMBER:
            // TODO
            break;
          
          case SettingType.TEXT:
            if (typeof settingEntry.multiline != 'boolean') {
              throw new Error(`settings[${i}].multiline not boolean: ${settingEntry.multiline}`);
            }
            
            newSettingEntry.multiline = settingEntry.multiline;
            
            SettingsManager.#validateText(settingEntry.defaultValue, newSettingEntry.multiline, newSettingEntry.updateValidator, false);
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          default:
            throw new Error('default case not possible, all options accounted for');
        }
        
        newSettingEntry.value = null;
        
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
  
  #createUI(uiEntries, settingsUiPropertiesMap) {
    removeAllNodes(this.#div);
    
    // TODO
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
    
    let {
      settingsMap,
      settingsUiPropertiesMap,
      uiEntries
    } = SettingsManager.#parseSettings(opts.settings, opts.localStorageKey != null);
    
    this.#button = opts.button;
    this.#div = opts.div;
    this.#localStorageKey = opts.localStorageKey;
    this.#settingsMap = settingsMap;
    
    this.#createUI(uiEntries, settingsUiPropertiesMap);
  }
  
  settingsList() {
    // TODO
  }
  
  has(name) {
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    return this.#settingsMap.has(name);
  }
  
  get(name) {
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    if (!this.#settingsMap.has(name)) {
      throw new Error(`Setting ${name} does not exist`);
    }
    
    return this.#settingsMap.get(name).value;
  }
  
  set(name, value) {
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    // TODO
  }
  
  getSettingsVisibility() {
    return this.#div.style.display != 'none';
  }
  
  setSettingsVisibility(visibility) {
    if (typeof visibility != 'string') {
      throw new Error(`Type of visibility not bool: ${typeof visibility}`);
    }
    
    if (visibility) {
      if (this.#div.style.display == 'none') {
        this.#div.style.display = '';
      }
    } else {
      if (this.#div.style.display != 'none') {
        this.#div.style.display = 'none';
      }
    }
  }
}
