import {
  SettingEnumUIType,
  SettingType,
  SettingType_TrueSettings,
  SettingVisibility,
} from './enums.mjs';
import { removeAllNodes } from '../misc/dom_tools.mjs';
import { isEnum } from '../misc/enum.mjs';

export class SettingsManager {
  // class variables
  
  #button;
  #btnToggleSettingsListener;
  #div;
  #localStorageKey;
  #settingsMap;
  
  // helper functions
  
  static #validateBool({
    value,
    oldValue,
    updateValidator,
    allowValueCoercion,
  }) {
    if (typeof value != 'boolean') {
      throw new Error(`value type not boolean: ${typeof value}`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value, oldValue);
      
      if (validationResults != null) {
        let adjustedNewValue = validationResults.adjustedNewValue;
        
        if (adjustedNewValue != null) {
          if (typeof adjustedNewValue != 'boolean') {
            throw new Error(`validator output not boolean: ${typeof adjustedNewValue}`);
          }
        } else {
          if (oldValue == null) {
            throw new Error('validator output revert to old value, but old value is null');
          }
        }
        
        if (allowValueCoercion) {
          return adjustedNewValue != null ? adjustedNewValue : oldValue;
        } else {
          throw new Error(`value does not pass validation function: ${adjustedNewValue == null ? 'Generic Failure' : 'Converted to: ' + adjustedNewValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateEnum({
    value,
    oldValue,
    enumValuesSet,
    updateValidator,
    allowValueCoercion,
  }) {
    if (typeof value != 'string') {
      throw new Error(`value type not string: ${typeof value}`);
    }
    
    if (!enumValuesSet.has(value)) {
      throw new Error(`value not present in enum: ${value}`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value, oldValue);
      
      if (validationResults != null) {
        let adjustedNewValue = validationResults.adjustedNewValue;
        
        if (adjustedNewValue != null) {
          if (typeof adjustedNewValue != 'string') {
            throw new Error(`validator output not string: ${typeof adjustedNewValue}`);
          }
          
          if (!enumValuesSet.has(adjustedNewValue)) {
            throw new Error(`validator output not present in enum: ${adjustedNewValue}`);
          }
        } else {
          if (oldValue == null) {
            throw new Error('validator output revert to old value, but old value is null');
          }
        }
        
        if (allowValueCoercion) {
          return adjustedNewValue != null ? adjustedNewValue : oldValue;
        } else {
          throw new Error(`value does not pass validation function: ${adjustedNewValue == null ? 'Generic Failure' : 'Converted to: ' + adjustedNewValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateInt({
    value,
    oldValue,
    min,
    max,
    updateValidator,
    allowValueCoercion,
  }) {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`value not integer: ${value}`);
    }
    
    if (min != null && value < min) {
      throw new Error(`value (${value}) < min (${min})`);
    }
    
    if (max != null && value > max) {
      throw new Error(`value (${value}) > max (${max})`);
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value, oldValue);
      
      if (validationResults != null) {
        let adjustedNewValue = validationResults.adjustedNewValue;
        
        if (adjustedNewValue != null) {
          if (!Number.isSafeInteger(adjustedNewValue)) {
            throw new Error(`validator output not integer: ${adjustedNewValue}`);
          }
          
          if (min != null && adjustedNewValue < min) {
            throw new Error(`validator output (${adjustedNewValue}) < min (${min})`);
          }
          
          if (max != null && adjustedNewValue > max) {
            throw new Error(`validator output (${adjustedNewValue}) > max (${max})`);
          }
        } else {
          if (oldValue == null) {
            throw new Error('validator output revert to old value, but old value is null');
          }
        }
        
        if (allowValueCoercion) {
          return adjustedNewValue != null ? adjustedNewValue : oldValue;
        } else {
          throw new Error(`value does not pass validation function: ${adjustedNewValue == null ? 'Generic Failure' : 'Converted to: ' + adjustedNewValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateNumber({
    value,
    oldValue,
    min,
    max,
    infinityAcceptable,
    nanAcceptable,
    updateValidator,
    allowValueCoercion,
  }) {
    if (typeof value != 'number') {
      throw new Error(`value not number: ${typeof value}`);
    }
    
    if (Number.isNaN(value)) {
      if (!nanAcceptable) {
        throw new Error(`value is NaN but NaN values are not allowed`);
      }
    } else {
      if (!Number.isFinite(value) && !infinityAcceptable) {
        throw new Error(`value is [+-] Infinity but Infinity values are not allowed: ${value}`);
      }
      
      if (min != null && value < min) {
        throw new Error(`value (${value}) < min (${min})`);
      }
      
      if (max != null && value > max) {
        throw new Error(`value (${value}) > max (${max})`);
      }
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value, oldValue);
      
      if (validationResults != null) {
        let adjustedNewValue = validationResults.adjustedNewValue;
        
        if (adjustedNewValue != null) {
          if (Number.isNaN(adjustedNewValue)) {
            if (!nanAcceptable) {
              throw new Error(`validator output is NaN but NaN values are not allowed`);
            }
          } else {
            if (!Number.isFinite(adjustedNewValue) && !infinityAcceptable) {
              throw new Error(`validator output is [+-] Infinity but Infinity values are not allowed: ${adjustedNewValue}`);
            }
            
            if (min != null && adjustedNewValue < min) {
              throw new Error(`validator output (${adjustedNewValue}) < min (${min})`);
            }
            
            if (max != null && adjustedNewValue > max) {
              throw new Error(`validator output (${adjustedNewValue}) > max (${max})`);
            }
          }
        } else {
          if (oldValue == null) {
            throw new Error('validator output revert to old value, but old value is null');
          }
        }
        
        if (allowValueCoercion) {
          return adjustedNewValue != null ? adjustedNewValue : oldValue;
        } else {
          throw new Error(`value does not pass validation function: ${adjustedNewValue == null ? 'Generic Failure' : 'Converted to: ' + adjustedNewValue}`);
        }
      }
    }
    
    if (allowValueCoercion) {
      return value;
    }
  }
  
  static #validateText({
    value,
    oldValue,
    multiline,
    updateValidator,
    allowValueCoercion,
  }) {
    if (typeof value != 'string') {
      throw new Error(`value type not string: ${typeof value}`);
    }
    
    if (!multiline) {
      if (value.includes('\n') || value.includes('\r')) {
        throw new Error(`text not multiline but value includes newlines: ${value}`);
      }
    }
    
    if (updateValidator != null) {
      let validationResults = updateValidator(value, oldValue);
      
      if (validationResults != null) {
        let adjustedNewValue = validationResults.adjustedNewValue;
        
        if (adjustedNewValue != null) {
          if (typeof adjustedNewValue != 'string') {
            throw new Error(`validator output not string: ${typeof adjustedNewValue}`);
          }
          
          if (!multiline) {
            if (adjustedNewValue.includes('\n') || adjustedNewValue.includes('\r')) {
              throw new Error(`text not multiline but validator output includes newlines: ${adjustedNewValue}`);
            }
          }
        } else {
          if (oldValue == null) {
            throw new Error('validator output revert to old value, but old value is null');
          }
        }
        
        if (allowValueCoercion) {
          return adjustedNewValue != null ? adjustedNewValue : oldValue;
        } else {
          throw new Error(`value does not pass validation function: ${adjustedNewValue == null ? 'Generic Failure' : 'Converted to: ' + adjustedNewValue}`);
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
      
      if (SettingType_TrueSettings.has(settingEntry.type)) {
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
        
        if (typeof settingEntry.visibility != 'object' && settingEntry.visibility != null) {
          throw new Error(`settings[${i}].visibility type not object or null: ${typeof settingEntry.visibility}`);
        }
        
        if (settingEntry.visibility != null) {
          settingUiProperties.visibility = {};
          
          if (typeof settingEntry.visibility.func != 'function') {
            throw new Error(`settings[${i}].visibility.func type not function: ${typeof settingEntry.visibility.func}`);
          }
          
          settingUiProperties.visibility.func = settingEntry.visibility.func;
          
          if (!Array.isArray(settingEntry.visibility.updateOn) && typeof settingEntry.visibility.updateOn != 'string') {
            throw new Error(`settings[${i}].visibility.updateOn not array or SettingVisibility enum: ${settingEntry.visibility.updateOn}`);
          }
          
          if (typeof settingEntry.visibility.updateOn == 'string') {
            if (!(settingEntry.visibility.updateOn in SettingVisibility)) {
              throw new Error(`settings[${i}].visibility.updateOn value not in SettingVisibility enum: ${settingEntry.visibility.updateOn}`);
            }
          } else {
            // updateOn must be an array here
            
            for (let j = 0; j < settingEntry.visibility.updateOn.length; j++) {
              let updateOnEntry = settingEntry.visibility.updateOn[j];
              
              if (typeof updateOnEntry != 'string') {
                throw new Error(`settings[${i}].visibility.updateOn[${j}] type not string: ${typeof updateOnEntry}`);
              }
            }
            
            settingUiProperties.visibility.updateOn = new Set(settingEntry.visibility.updateOn);
          }
        } else {
          settingUiProperties.visibility = null;
        }
        
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
            try {
              SettingsManager.#validateBool({
                value: settingEntry.defaultValue,
                oldValue: null,
                updateValidator: newSettingEntry.updateValidator,
                allowValueCoercion: false,
              });
            } catch (err) {
              throw new Error(`settings[${i}].defaultValue: ${err.toString()}`);
            }
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.ENUM: {
            let values = [];
            let valuesSet = new Set();
            let valueNames = new Map();
            
            if (!Array.isArray(settingEntry.values)) {
              throw new Error(`settings[${i}].values not array: ${settingEntry.values}`);
            }
            
            for (let j = 0; j < settingEntry.values.length; j++) {
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
              
              if (valuesSet.has(valueEntry.name)) {
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
            
            try {
              SettingsManager.#validateEnum({
                value: settingEntry.defaultValue,
                oldValue: null,
                enumValuesSet: valuesSet,
                updateValidator: newSettingEntry.updateValidator,
                allowValueCoercion: false,
              });
            } catch (err) {
              throw new Error(`settings[${i}].defaultValue: ${err.toString()}`);
            }
            
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
            
            if (newSettingEntry.min > newSettingEntry.max) {
              throw new Error(`settings[${i}].min (${newSettingEntry.min}) > settings[${i}].max (${newSettingEntry.max})`);
            }
            
            if (typeof settingEntry.sliderPresent != 'boolean' && settingEntry.sliderPresent != null) {
              throw new Error(`settings[${i}].sliderPresent not boolean: ${typeof settingEntry.sliderPresent}`);
            }
            
            settingUiProperties.sliderPresent = settingEntry.sliderPresent ?? false;
            
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
                
                settingUiProperties.sliderMin = settingEntry.sliderMin != null ? settingEntry.sliderMin : newSettingEntry.min;
                settingUiProperties.sliderMax = settingEntry.sliderMax != null ? settingEntry.sliderMax : newSettingEntry.max;
              }
              
              // if sliderMin is not null, so is sliderMax, so only need to check one
              if (settingUiProperties.sliderMin != null) {
                if (settingUiProperties.sliderMin > settingUiProperties.sliderMax) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) > settings[${i}].sliderMax (${settingUiProperties.sliderMax})`);
                }
                
                if (newSettingEntry.min != null && settingUiProperties.sliderMin < newSettingEntry.min) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) < settings[${i}].min (${newSettingEntry.min})`);
                }
                
                if (newSettingEntry.max != null && settingUiProperties.sliderMin > newSettingEntry.max) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) > settings[${i}].max (${newSettingEntry.max})`);
                }
                
                if (newSettingEntry.min != null && settingUiProperties.sliderMax < newSettingEntry.min) {
                  throw new Error(`settings[${i}].sliderMax (${settingUiProperties.sliderMax}) < settings[${i}].min (${newSettingEntry.min})`);
                }
                
                if (newSettingEntry.max != null && settingUiProperties.sliderMax > newSettingEntry.max) {
                  throw new Error(`settings[${i}].sliderMax (${settingUiProperties.sliderMax}) > settings[${i}].max (${newSettingEntry.max})`);
                }
              }
              
              if (typeof settingEntry.largeSliderAndNumberBox != 'boolean' && settingEntry.largeSliderAndNumberBox != null) {
                throw new Error(`settings[${i}].largeSliderAndNumberBox not boolean: ${settingEntry.largeSliderAndNumberBox}`);
              }
              
              settingUiProperties.largeSliderAndNumberBox = settingEntry.largeSliderAndNumberBox ?? false;
              
              if (typeof settingEntry.sliderDraggingIsUpdate != 'boolean' && settingEntry.sliderDraggingIsUpdate != null) {
                throw new Error(`settings[${i}].sliderDraggingIsUpdate not boolean: ${settingEntry.sliderDraggingIsUpdate}`);
              }
              
              settingUiProperties.sliderDraggingIsUpdate = settingEntry.sliderDraggingIsUpdate ?? false;
            }
            
            try {
              SettingsManager.#validateInt({
                value: settingEntry.defaultValue,
                oldValue: null,
                min: newSettingEntry.min,
                max: newSettingEntry.max,
                updateValidator: newSettingEntry.updateValidator,
                allowValueCoercion: false,
              });
            } catch (err) {
              throw new Error(`settings[${i}].defaultValue: ${err.toString()}`);
            }
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.NUMBER:
            if (typeof settingEntry.nanAcceptable != 'boolean') {
              throw new Error(`settings[${i}].nanAcceptable not boolean: ${typeof settingEntry.nanAcceptable}`);
            }
            
            newSettingEntry.nanAcceptable = settingEntry.nanAcceptable;
            
            if (typeof settingEntry.min != 'number' && settingEntry.min != null) {
              throw new Error(`settings[${i}].min not number or null: ${settingEntry.min}`);
            }
            
            if (settingEntry.min != null) {
              if (Number.isNaN(settingEntry.min)) {
                throw new Error(`settings[${i}].min is NaN`);
              }
              
              if (settingEntry.min == Infinity && !newSettingEntry.infinityAcceptable) {
                throw new Error(`settings[${i}].min is +Infinity but infinity values are not allowed`);
              }
              
              if (settingEntry.min == -Infinity) {
                newSettingEntry.min = null;
              } else {
                newSettingEntry.min = settingEntry.min;
              }
            } else {
              newSettingEntry.min = null;
            }
            
            if (typeof settingEntry.max != 'number' && settingEntry.max != null) {
              throw new Error(`settings[${i}].max not number or null: ${settingEntry.max}`);
            }
            
            if (settingEntry.max != null) {
              if (Number.isNaN(settingEntry.max)) {
                throw new Error(`settings[${i}].max is NaN`);
              }
              
              if (settingEntry.max == Infinity && !newSettingEntry.infinityAcceptable) {
                throw new Error(`settings[${i}].max is +Infinity but infinity values are not allowed`);
              }
              
              if (settingEntry.max == -Infinity) {
                newSettingEntry.max = null;
              } else {
                newSettingEntry.max = settingEntry.max;
              }
            } else {
              newSettingEntry.max = null;
            }
            
            if (newSettingEntry.min != null && newSettingEntry.max != null) {
              if (newSettingEntry.min > newSettingEntry.max) {
                throw new Error(`settings[${i}].min (${newSettingEntry.min}) > settings[${i}].max (${newSettingEntry.max})`);
              }
            }
            
            if (newSettingEntry.min != null && newSettingEntry.max != null) {
              if (settingEntry.infinityAcceptable != null) {
                throw new Error(`settings[${i}].infinityAcceptable not nullish despite min and max defined: ${settingEntry.infinityAcceptable}`);
              }
              
              newSettingEntry.infinityAcceptable = false;
            } else {
              if (typeof settingEntry.infinityAcceptable != 'boolean') {
                throw new Error(`settings[${i}].infinityAcceptable not boolean despite either min or max not defined: ${typeof settingEntry.infinityAcceptable}`);
              }
              
              newSettingEntry.infinityAcceptable = settingEntry.infinityAcceptable;
            }
            
            if (typeof settingEntry.sliderPresent != 'boolean' && settingEntry.sliderPresent != null) {
              throw new Error(`settings[${i}].sliderPresent not boolean: ${typeof settingEntry.sliderPresent}`);
            }
            
            settingUiProperties.sliderPresent = settingEntry.sliderPresent ?? false;
            
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
                
                if (!Number.isSafeInteger(settingEntry.sliderMapping.sliderIncrements) && settingEntry.sliderMapping.sliderIncrements != Infinity) {
                  throw new Error(`settings[${i}].sliderMapping.sliderIncrements not integer or infinity: ${settingEntry.sliderMapping.sliderIncrements}`);
                }
                
                if (settingEntry.sliderMapping.sliderIncrements != Infinity && settingEntry.sliderMapping.sliderIncrements <= 0) {
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
              
              if (typeof settingEntry.sliderMin != 'number' && settingEntry.sliderMin != null) {
                throw new Error(`settings[${i}].sliderMin not number or null: ${typeof settingEntry.sliderMin}`);
              }
              
              if (typeof settingEntry.sliderMax != 'number' && settingEntry.sliderMax != null) {
                throw new Error(`settings[${i}].sliderMax not number or null: ${typeof settingEntry.sliderMax}`);
              }
              
              if (settingEntry.sliderMin != null) {
                if (Number.isNaN(settingEntry.sliderMin)) {
                  throw new Error(`settings[${i}].sliderMin is NaN`);
                }
                
                if (!Number.isFinite(settingEntry.sliderMin)) {
                  throw new Error(`settings[${i}].sliderMin is [+-] Infinity: ${settingEntry.sliderMin}`);
                }
              }
              
              if (settingEntry.sliderMax != null) {
                if (Number.isNaN(settingEntry.sliderMax)) {
                  throw new Error(`settings[${i}].sliderMax is NaN`);
                }
                
                if (!Number.isFinite(settingEntry.sliderMax)) {
                  throw new Error(`settings[${i}].sliderMax is [+-] Infinity: ${settingEntry.sliderMax}`);
                }
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
                
                settingUiProperties.sliderMin = settingEntry.sliderMin != null ? settingEntry.sliderMin : newSettingEntry.min;
                settingUiProperties.sliderMax = settingEntry.sliderMax != null ? settingEntry.sliderMax : newSettingEntry.max;
              }
              
              // if sliderMin is not null, so is sliderMax, so only need to check one
              if (settingUiProperties.sliderMin != null) {
                if (settingUiProperties.sliderMin > settingUiProperties.sliderMax) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) > settings[${i}].sliderMax (${settingUiProperties.sliderMax})`);
                }
                
                if (newSettingEntry.min != null && settingUiProperties.sliderMin < newSettingEntry.min) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) < settings[${i}].min (${newSettingEntry.min})`);
                }
                
                if (newSettingEntry.max != null && settingUiProperties.sliderMin > newSettingEntry.max) {
                  throw new Error(`settings[${i}].sliderMin (${settingUiProperties.sliderMin}) > settings[${i}].max (${newSettingEntry.max})`);
                }
                
                if (newSettingEntry.min != null && settingUiProperties.sliderMax < newSettingEntry.min) {
                  throw new Error(`settings[${i}].sliderMax (${settingUiProperties.sliderMax}) < settings[${i}].min (${newSettingEntry.min})`);
                }
                
                if (newSettingEntry.max != null && settingUiProperties.sliderMax > newSettingEntry.max) {
                  throw new Error(`settings[${i}].sliderMax (${settingUiProperties.sliderMax}) > settings[${i}].max (${newSettingEntry.max})`);
                }
              }
              
              if (typeof settingEntry.sliderStepSize != 'number' && settingEntry.sliderStepSize != null) {
                throw new Error(`settings[${i}].sliderStepSize not number: ${typeof settingEntry.sliderStepSize}`);
              }
              
              if (settingEntry.sliderStepSize != null) {
                if (Number.isNaN(settingEntry.sliderStepSize)) {
                  throw new Error(`settings[${i}].sliderStepSize is NaN`);
                }
                
                if (settingEntry.sliderStepSize < 0 || settingEntry.sliderStepSize == Infinity) {
                  throw new Error(`settings[${i}].sliderStepSize out of range 0 <= x < Infinity: ${settingEntry.sliderStepSize}`);
                }
              }
              
              settingUiProperties.sliderStepSize = settingEntry.sliderStepSize ?? 0;
              
              if (typeof settingEntry.largeSliderAndNumberBox != 'boolean' && settingEntry.largeSliderAndNumberBox != null) {
                throw new Error(`settings[${i}].largeSliderAndNumberBox not boolean: ${settingEntry.largeSliderAndNumberBox}`);
              }
              
              settingUiProperties.largeSliderAndNumberBox = settingEntry.largeSliderAndNumberBox ?? null;
              
              if (typeof settingEntry.sliderDraggingIsUpdate != 'boolean' && settingEntry.sliderDraggingIsUpdate != null) {
                throw new Error(`settings[${i}].sliderDraggingIsUpdate not boolean: ${settingEntry.sliderDraggingIsUpdate}`);
              }
              
              settingUiProperties.sliderDraggingIsUpdate = settingEntry.sliderDraggingIsUpdate ?? null;
            }
            
            try {
              SettingsManager.#validateNumber({
                value: settingEntry.defaultValue,
                oldValue: null,
                min: newSettingEntry.min,
                max: newSettingEntry.max,
                infinityAcceptable: newSettingEntry.infinityAcceptable,
                nanAcceptable: newSettingEntry.nanAcceptable,
                updateValidator: newSettingEntry.updateValidator,
                allowValueCoercion: false,
              });
            } catch (err) {
              throw new Error(`settings[${i}].defaultValue: ${err.toString()}`);
            }
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          case SettingType.TEXT:
            if (typeof settingEntry.multiline != 'boolean') {
              throw new Error(`settings[${i}].multiline not boolean: ${settingEntry.multiline}`);
            }
            
            newSettingEntry.multiline = settingEntry.multiline;
            
            try {
              SettingsManager.#validateText({
                value: settingEntry.defaultValue,
                oldValue: null,
                multiline: newSettingEntry.multiline,
                updateValidator: newSettingEntry.updateValidator,
                allowValueCoercion: false,
              });
            } catch (err) {
              throw new Error(`settings[${i}].defaultValue: ${err.toString()}`);
            }
            
            newSettingEntry.defaultValue = settingEntry.defaultValue;
            break;
          
          default:
            throw new Error('default case not possible, all options accounted for');
        }
        
        // set to null for now, will be overwritten later during
        // persistence loading stage; before construction of SettingsManager is complete
        newSettingEntry.value = null;
        
        settingsMap.set(settingEntry.name, newSettingEntry);
        settingsUiPropertiesMap.set(settingEntry.name, settingUiProperties);
        uiEntries.push({
          type: null,
          name: settingEntry.name,
        });
      } else {
        switch (settingEntry.type) {
          case SettingType.SEPARATOR:
            uiEntries.push({
              type: settingEntry.type,
              text: settingEntry.text,
            });
            break;
          
          case SettingType.HEADER:
          case SettingType.INFO_TEXT:
            if (typeof settingEntry.text != 'string') {
              throw new Error(`settings[${i}].text not string: ${typeof settingEntry.text}`);
            }
            
            uiEntries.push({
              type: settingEntry.type,
              text: settingEntry.text,
            });
            break;
          
          case SettingType.BUTTON:
            if (typeof settingEntry.text != 'string') {
              throw new Error(`settings[${i}].text not string: ${typeof settingEntry.text}`);
            }
            
            if (typeof settingEntry.onClick != 'function') {
              throw new Error(`settings[${i}].onClick not function: ${typeof settingEntry.onClick}`);
            }
            
            uiEntries.push({
              type: settingEntry.type,
              text: settingEntry.text,
              onClick: settingEntry.onClick,
            });
            break;
          
          default:
            throw new Error('default case not possible, all options accounted for');
        }
      }
    }
    
    for (let [ name, settingUiEntry ] of settingsUiPropertiesMap.entries()) {
      if (settingUiEntry.visibility != null && typeof settingUiEntry.visibility.updateOn != 'string') {
        // updateOn is array here
        
        for (let i = 0; i < settingUiEntry.visibility.updateOn.length; i++) {
          let updateOnEntry = settingUiEntry.visibility.updateOn[i];
          
          if (!settingsMap.has(updateOnEntry)) {
            throw new Error(`setting[name: ${name}].visibility.updateOn[${i}] name not in settings: ${updateOnEntry}`);
          }
        }
      }
    }
    
    return {
      settingsMap,
      settingsUiPropertiesMap,
      uiEntries,
    };
  }
  
  #initialSettingValuesLoad() {
    // TODO pull data from persistence
    
    for (let settingEntry of this.#settingsMap.values()) {
      settingEntry.value = settingEntry.defaultValue;
    }
  }
  
  #createUI(uiEntries, settingsUiPropertiesMap) {
    removeAllNodes(this.#div);
    
    for (let entry of uiEntries) {
      switch (entry.type) {
        case SettingType.SEPARATOR: {
          this.#div.appendChild(document.createElement('hr'));
          break;
        }
        
        case SettingType.HEADER: {
          let headerElem = document.createElement('h2');
          headerElem.textContent = entry.text;
          this.#div.appendChild(headerElem);
          break;
        }
        
        case SettingType.INFO_TEXT: {
          let textElem = document.createElement('p');
          textElem.textContent = entry.text;
          this.#div.appendChild(textElem);
          break;
        }
        
        case SettingType.BUTTON: {
          let buttonElem = document.createElement('button');
          buttonElem.textContent = entry.text;
          buttonElem.addEventListener('click', entry.onClick);
          this.#div.appendChild(buttonElem);
          break;
        }
        
        case null: {
          // TODO
          break;
        }
        
        default:
          throw new Error('default case not possible, all options accounted for');
      }
    }
  }
  
  #destroyUI() {
    removeAllNodes(this.#div);
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
      uiEntries,
    } = SettingsManager.#parseSettings(opts.settings, opts.localStorageKey != null);
    
    this.#button = opts.button;
    this.#div = opts.div;
    this.#localStorageKey = opts.localStorageKey;
    this.#settingsMap = settingsMap;
    
    this.#initialSettingValuesLoad();
    
    this.#btnToggleSettingsListener = this.toggleSettingsVisibility.bind(this);
    this.#button.addEventListener('click', this.#btnToggleSettingsListener);
    
    this.#createUI(uiEntries, settingsUiPropertiesMap);
  }
  
  tearDown() {
    if (this.#button == null) {
      throw new Error('SettingsManager already torn down');
    }
    
    this.#destroyUI();
    
    this.#button.removeEventListener('click', this.#btnToggleSettingsListener);
    this.#btnToggleSettingsListener = null;
    
    this.#button = null;
    this.#div = null;
    this.#localStorageKey = null;
    this.#settingsMap = null;
  }
  
  isTornDown() {
    return this.#button == null;
  }
  
  settingsList() {
    if (this.#button == null) {
      throw new Error('cannot get settings list, manager torn down');
    }
    
    return Array.from(this.#settingsMap.keys());
  }
  
  has(name) {
    if (this.#button == null) {
      throw new Error('cannot read/write settings, manager torn down');
    }
    
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    return this.#settingsMap.has(name);
  }
  
  get(name) {
    if (this.#button == null) {
      throw new Error('cannot read/write settings, manager torn down');
    }
    
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    if (!this.#settingsMap.has(name)) {
      throw new Error(`Setting ${name} does not exist`);
    }
    
    return this.#settingsMap.get(name).value;
  }
  
  set(name, value) {
    if (this.#button == null) {
      throw new Error('cannot read/write settings, manager torn down');
    }
    
    if (typeof name != 'string') {
      throw new Error(`Type of name not string: ${typeof name}`);
    }
    
    if (!this.#settingsMap.has(name)) {
      throw new Error(`Setting ${name} does not exist`);
    }
    
    let settingEntry = this.#settingsMap.get(name);
    
    // TODO
  }
  
  getSettingsVisibility() {
    if (this.#button == null) {
      throw new Error('cannot read/write settings visibility, manager torn down');
    }
    
    return this.#div.style.display != 'none';
  }
  
  setSettingsVisibility(visibility) {
    if (this.#button == null) {
      throw new Error('cannot read/write settings visibility, manager torn down');
    }
    
    if (typeof visibility != 'boolean') {
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
  
  toggleSettingsVisibility() {
    if (this.#button == null) {
      throw new Error('cannot read/write settings visibility, manager torn down');
    }
    
    this.setSettingsVisibility(!this.getSettingsVisibility());
  }
}
