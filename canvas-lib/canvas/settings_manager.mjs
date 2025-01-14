import { SettingType } from './enums.mjs';
import { parseSettings } from './settings_parser.mjs';
import { removeAllNodes } from '../misc/dom_tools.mjs';

export class SettingsManager {
  // class variables
  
  #button;
  #btnToggleSettingsListener;
  #div;
  #localStorageKey;
  #settingsMap;
  #settingsUiPropertiesMap;
  
  // helper functions
  
  #postSettingUpdateHooks(name) {
    let settingEntry = this.#settingsMap.get(name);
    
    // TODO visibility updates
    
    if (settingEntry.onUpdate) {
      try {
        settingEntry.onUpdate(settingEntry.value);
      } catch (err) {
        console.error(err);
      }
    }
  }
  
  #updateSettingFromElement(name, value) {
    this.#settingsMap.get(name).value = value;
  }
  
  #initialSettingValuesLoad() {
    // TODO pull data from persistence
    
    for (let settingEntry of this.#settingsMap.values()) {
      settingEntry.value = settingEntry.defaultValue;
    }
  }
  
  #createUI(uiEntries) {
    let elemsToAdd = [];
    
    for (let entry of uiEntries) {
      switch (entry.type) {
        case SettingType.SEPARATOR: {
          elemsToAdd.push(document.createElement('hr'));
          break;
        }
        
        case SettingType.HEADER: {
          let headerElem = document.createElement('h2');
          headerElem.textContent = entry.text;
          elemsToAdd.push(headerElem);
          break;
        }
        
        case SettingType.INFO_TEXT: {
          let textElem = document.createElement('p');
          textElem.textContent = entry.text;
          elemsToAdd.push(textElem);
          break;
        }
        
        case SettingType.BUTTON: {
          let buttonElem = document.createElement('button');
          buttonElem.textContent = entry.text;
          buttonElem.addEventListener('click', entry.onClick);
          elemsToAdd.push(buttonElem);
          break;
        }
        
        case null: {
          let settingEntry = this.#settingsMap.get(entry.name);
          let settingUIEntry = this.#settingsUiPropertiesMap.get(entry.name);
          
          switch (settingEntry.type) {
            case SettingType.BOOLEAN:
              let container = document.createElement('div');
              
              let checkElem = document.createElement('input');
              checkElem.type = 'checkbox';
              let id = checkElem.id = crypto.randomUUID();
              checkElem.addEventListener('change', () => {
                this.#updateSettingFromElement(settingEntry.name, checkElem.checked);
              });
              container.appendChild(checkElem);
              
              let labelElem = document.createElement('label');
              labelElem.textContent = settingUIEntry.displayName;
              labelElem.htmlFor = id;
              container.appendChild(labelElem);
              
              elemsToAdd.push(container);
              break;
            
            case SettingType.ENUM:
              break;
            
            case SettingType.INTEGER:
              break;
            
            case SettingType.NUMBER:
              break;
            
            case SettingType.TEXT:
              break;
            
            default:
              throw new Error('default case not possible, all options accounted for');
          }
          break;
        }
        
        default:
          throw new Error('default case not possible, all options accounted for');
      }
    }
    
    removeAllNodes(this.#div);
    
    for (let elem of elemsToAdd) {
      this.#div.appendChild(elem);
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
    } = parseSettings(opts.settings, opts.localStorageKey != null);
    
    this.#button = opts.button;
    this.#div = opts.div;
    this.#localStorageKey = opts.localStorageKey;
    this.#settingsMap = settingsMap;
    this.#settingsUiPropertiesMap = settingsUiPropertiesMap;
    
    this.#initialSettingValuesLoad();
    
    this.#btnToggleSettingsListener = this.toggleSettingsVisibility.bind(this);
    this.#button.addEventListener('click', this.#btnToggleSettingsListener);
    
    try {
      this.#createUI(uiEntries);
    } catch (err) {
      this.#button.removeEventListener('click', this.#btnToggleSettingsListener);
      this.#btnToggleSettingsListener = null;
      
      this.#button = null;
      this.#div = null;
      this.#localStorageKey = null;
      this.#settingsMap = null;
      
      throw err;
    }
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
    
    settingEntry.value = value;
    
    this.#postSettingUpdateHooks(name);
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
