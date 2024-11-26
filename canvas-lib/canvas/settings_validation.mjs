function validatorThrowOrReturn({
  errorToThrowGenerator,
  valueToReturn,
  returnValueNullErrorGenerator,
  performThrow,
}) {
  if (performThrow) {
    throw errorToThrowGenerator();
  } else {
    if (valueToReturn == null) {
      if (returnValueNullErrorGenerator) {
        throw returnValueNullErrorGenerator();
      } else {
        throw new Error('valueToReturn is null');
      }
    } else {
      return valueToReturn;
    }
  }
}

function validatorThrowOrReturnGenerator({
  errorToThrowGenerator,
  valueToReturnGenerator,
  returnValueNullErrorGenerator,
  performThrow,
}) {
  if (performThrow) {
    throw errorToThrowGenerator();
  } else {
    let valueToReturn = valueToReturnGenerator();
    if (valueToReturn == null) {
      if (returnValueNullErrorGenerator) {
        throw returnValueNullErrorGenerator();
      } else {
        throw new Error('valueToReturn is null');
      }
    } else {
      return valueToReturn;
    }
  }
}

function validatorThrowOrReturnAndLog({
  errorToThrow,
  valueToReturn,
  returnValueNullErrorGenerator,
  performThrow,
}) {
  if (performThrow) {
    throw errorToThrow;
  } else {
    console.error(errorToThrow);
    
    if (valueToReturn == null) {
      if (returnValueNullErrorGenerator) {
        throw returnValueNullErrorGenerator();
      } else {
        throw new Error('valueToReturn is null');
      }
    } else {
      return valueToReturn;
    }
  }
}

// return null means new value is acceptable
// otherwise returned value is coerced value
// or if error thrown then value is invalid or coercions not allowed or error in validator
export function validateBool({
  value,
  oldValue,
  updateValidator,
  allowValueCoercion,
  revertWithoutErrorAndSuppressValidatorErrors,
}) {
  // invalid type
  
  if (typeof value != 'boolean') {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value type not boolean: ${typeof value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('invalid type for value, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  if (updateValidator != null) {
    // catch possible error during validator func
    
    let validationResults;
    
    try {
      validationResults = updateValidator(value, oldValue);
    } catch (err) {
      return validatorThrowOrReturnAndLog({
        errorToThrow: err,
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('validator error, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (validationResults != null) {
      let adjustedNewValue = validationResults.adjustedNewValue;
      
      if (adjustedNewValue == null) {
        // validator requested revert
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator requested revert but value coercion not allowed'),
          valueToReturn: oldValue,
          returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
          performThrow: !allowValueCoercion,
        });
      } else {
        // validator provided new value
        
        if (typeof adjustedNewValue != 'boolean') {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not boolean: ${typeof adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error(`validator output not boolean (${typeof adjustedNewValue}), so revert to old value, but old value is null`),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        // valid new value from validator
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator output new value, but allowValueCoercion is false'),
          valueToReturn: adjustedNewValue,
          returnValueNullErrorGenerator: () => new Error('validator requested new value but value is null (should not be possible)'),
          performThrow: !allowValueCoercion,
        });
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// return null means new value is acceptable
// otherwise returned value is coerced value
// or if error thrown then value is invalid or coercions not allowed or error in validator
export function validateEnum({
  value,
  oldValue,
  enumValuesSet,
  updateValidator,
  allowValueCoercion,
  revertWithoutErrorAndSuppressValidatorErrors,
}) {
  // invalid type
  
  if (typeof value != 'string') {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value type not string: ${typeof value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('invalid type for value, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  if (!enumValuesSet.has(value)) {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value not present in enum: ${value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('value not in enum, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  if (updateValidator != null) {
    // catch possible error during validator func
    
    let validationResults;
    
    try {
      validationResults = updateValidator(value, oldValue);
    } catch (err) {
      return validatorThrowOrReturnAndLog({
        errorToThrow: err,
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('validator error, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (validationResults != null) {
      let adjustedNewValue = validationResults.adjustedNewValue;
      
      if (adjustedNewValue == null) {
        // validator requested revert
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator requested revert but value coercion not allowed'),
          valueToReturn: oldValue,
          returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
          performThrow: !allowValueCoercion,
        });
      } else {
        // validator provided new value
        
        if (typeof adjustedNewValue != 'string') {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not string: ${typeof adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error(`validator output not string (${typeof adjustedNewValue}), so revert to old value, but old value is null`),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
  
        if (!enumValuesSet.has(adjustedNewValue)) {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not present in enum: ${adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error(`validator output not present in enum (${adjustedNewValue}), so revert to old value, but old value is null`),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        // valid new value from validator
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator output new value, but allowValueCoercion is false'),
          valueToReturn: adjustedNewValue,
          returnValueNullErrorGenerator: null,
          performThrow: !allowValueCoercion,
        });
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// return null means new value is acceptable
// otherwise returned value is coerced value
// or if error thrown then value is invalid or coercions not allowed or error in validator
export function validateInt({
  value,
  oldValue,
  min,
  max,
  updateValidator,
  allowValueCoercion,
  revertWithoutErrorAndSuppressValidatorErrors,
}) {
  // invalid type
  
  if (!Number.isSafeInteger(value)) {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value not integer: ${value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('invalid type for value, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  // coercible value constraints
  
  let preAlteredValue = null;
  
  if (min != null && value < min) {
    preAlteredValue = validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value (${value}) < min (${min})`),
      valueToReturn: min,
      returnValueNullErrorGenerator: null,
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  if (max != null && value > max) {
    preAlteredValue = validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value (${value}) > max (${max})`),
      valueToReturn: max,
      returnValueNullErrorGenerator: null,
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  if (updateValidator != null) {
    // catch possible error during validator func
    
    let validationResults;
    
    try {
      if (preAlteredValue != null) {
        validationResults = updateValidator(preAlteredValue, oldValue);
      } else {
        validationResults = updateValidator(value, oldValue);
      }
    } catch (err) {
      return validatorThrowOrReturnAndLog({
        errorToThrow: err,
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('validator error, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (validationResults != null) {
      let adjustedNewValue = validationResults.adjustedNewValue;
      
      if (adjustedNewValue == null) {
        // validator requested revert
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator requested revert but value coercion not allowed'),
          valueToReturn: oldValue,
          returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
          performThrow: !allowValueCoercion,
        });
      } else {
        // validator provided new value
        
        if (!Number.isSafeInteger(adjustedNewValue)) {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not integer: ${adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error(`validator output not integer (${typeof adjustedNewValue}), so revert to old value, but old value is null`),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        // validator failed coercible value constraints
        
        if (min != null && adjustedNewValue < min) {
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output (${adjustedNewValue}) < min (${min})`),
            valueToReturn: min,
            returnValueNullErrorGenerator: null,
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        if (max != null && adjustedNewValue > max) {
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output (${adjustedNewValue}) > max (${max})`),
            valueToReturn: max,
            returnValueNullErrorGenerator: null,
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        // valid new value from validator
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator output new value, but allowValueCoercion is false'),
          valueToReturn: adjustedNewValue,
          returnValueNullErrorGenerator: () => new Error('validator requested new value but value is null (should not be possible)'),
          performThrow: !allowValueCoercion,
        });
      }
    } else {
      // fall through to ending if
    }
  } else {
    // fall through to ending if
  }
  
  if (preAlteredValue != null) {
    // ordinarily there would be a possible throw here if allowValueCoercion = false, but
    // preAlteredValue is only set if allowValueCoercion = true
    return preAlteredValue;
  } else {
    return null;
  }
}

// return null means new value is acceptable
// otherwise returned value is coerced value
// or if error thrown then value is invalid or coercions not allowed or error in validator
export function validateNumber({
  value,
  oldValue,
  min,
  max,
  infinityAcceptable,
  nanAcceptable,
  updateValidator,
  allowValueCoercion,
  revertWithoutErrorAndSuppressValidatorErrors,
}) {
  // invalid type
  
  if (typeof value != 'number') {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value type not number: ${typeof value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('invalid type for value, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  // uncoercible value constraints
  
  if (Number.isNaN(value)) {
    if (!nanAcceptable) {
      return validatorThrowOrReturn({
        errorToThrowGenerator: () => new Error(`value is NaN but NaN values are not allowed`),
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('value is NaN but NaN values are not allowed, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
  } else {
    if (!infinityAcceptable && !Number.isFinite(value)) {
      return validatorThrowOrReturn({
        errorToThrowGenerator: () => new Error(`value is [+-] Infinity but Infinity values are not allowed: ${value}`),
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error(`value is [+-] Infinity (${value}) but Infinity values are not allowed, so revert to old value, but old value is null`),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
  }
  
  // coercible value constraints
  
  let preAlteredValue = null;
  
  if (!Number.isNaN(value)) {
    if (min != null && value < min) {
      preAlteredValue = validatorThrowOrReturn({
        errorToThrowGenerator: () => new Error(`value (${value}) < min (${min})`),
        valueToReturn: min,
        returnValueNullErrorGenerator: null,
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (max != null && value > max) {
      preAlteredValue = validatorThrowOrReturn({
        errorToThrowGenerator: () => new Error(`value (${value}) > max (${max})`),
        valueToReturn: max,
        returnValueNullErrorGenerator: null,
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
  }
  
  if (updateValidator != null) {
    // catch possible error during validator func
    
    let validationResults;
    
    try {
      if (preAlteredValue != null) {
        validationResults = updateValidator(preAlteredValue, oldValue);
      } else {
        validationResults = updateValidator(value, oldValue);
      }
    } catch (err) {
      return validatorThrowOrReturnAndLog({
        errorToThrow: err,
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('validator error, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (validationResults != null) {
      let adjustedNewValue = validationResults.adjustedNewValue;
      
      if (adjustedNewValue == null) {
        // validator requested revert
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator requested revert but value coercion not allowed'),
          valueToReturn: oldValue,
          returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
          performThrow: !allowValueCoercion,
        });
      } else {
        // validator provided new value
        
        if (typeof adjustedNewValue != 'number') {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not number: ${typeof adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error('validator output not number, so revert to old value, but old value is null'),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        // validator failed uncoercible value constraint
        
        if (Number.isNaN(adjustedNewValue)) {
          if (!nanAcceptable) {
            return validatorThrowOrReturnAndLog({
              errorToThrow: new Error(`validator output is NaN but NaN values are not allowed`),
              valueToReturn: oldValue,
              returnValueNullErrorGenerator: () => new Error('validator output is NaN but NaN values are not allowed, so revert to old value, but old value is null'),
              performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
            });
          }
        } else {
          if (!infinityAcceptable && !Number.isFinite(adjustedNewValue)) {
            return validatorThrowOrReturnAndLog({
              errorToThrow: new Error(`validator output is [+-] Infinity but Infinity values are not allowed: ${adjustedNewValue}`),
              valueToReturn: oldValue,
              returnValueNullErrorGenerator: () => new Error(`validator output is [+-] Infinity (${adjustedNewValue}) but Infinity values are not allowed, so revert to old value, but old value is null`),
              performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
            });
          }
        }
        
        // validator failed coercible value constraint
        
        if (!Number.isNaN(adjustedNewValue)) {
          if (min != null && adjustedNewValue < min) {
            return validatorThrowOrReturnAndLog({
              errorToThrow: new Error(`validator output (${adjustedNewValue}) < min (${min})`),
              valueToReturn: min,
              returnValueNullErrorGenerator: null,
              performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
            });
          }
          
          if (max != null && adjustedNewValue > max) {
            return validatorThrowOrReturnAndLog({
              errorToThrow: new Error(`validator output (${adjustedNewValue}) > max (${max})`),
              valueToReturn: max,
              returnValueNullErrorGenerator: null,
              performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
            });
          }
        }
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator output new value, but allowValueCoercion is false'),
          valueToReturn: adjustedNewValue,
          returnValueNullErrorGenerator: () => new Error('validator requested new value but value is null (should not be possible)'),
          performThrow: !allowValueCoercion,
        });
      }
    } else {
      // fall through to ending if
    }
  } else {
    // fall through to ending if
  }
  
  if (preAlteredValue != null) {
    // ordinarily there would be a possible throw here if allowValueCoercion = false, but
    // preAlteredValue is only set if allowValueCoercion = true
    return preAlteredValue;
  } else {
    return null;
  }
}

// return null means new value is acceptable
// otherwise returned value is coerced value
// or if error thrown then value is invalid or coercions not allowed or error in validator
export function validateText({
  value,
  oldValue,
  multiline,
  updateValidator,
  allowValueCoercion,
  revertWithoutErrorAndSuppressValidatorErrors,
}) {
  // invalid type
  
  if (typeof value != 'string') {
    return validatorThrowOrReturn({
      errorToThrowGenerator: () => new Error(`value type not string: ${typeof value}`),
      valueToReturn: oldValue,
      returnValueNullErrorGenerator: () => new Error('invalid type for value, so revert to old value, but old value is null'),
      performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
    });
  }
  
  // coercible value constraints
  
  let preAlteredValue = null;
  
  if (!multiline) {
    if (value.includes('\n') || value.includes('\r')) {
      preAlteredValue = validatorThrowOrReturnGenerator({
        errorToThrowGenerator: () => new Error(`text not multiline but value includes newlines: ${value}`),
        valueToReturnGenerator: () => value.replaceAll(/[\r\n]/, ''),
        returnValueNullErrorGenerator: () => new Error('text not multiline so revert but old value null'),
        performThrow: !allowValueCoercion,
      });
    }
  }
  
  if (updateValidator != null) {
    // possible error during validator func
    
    let validationResults;
    
    try {
      if (preAlteredValue != null) {
        validationResults = updateValidator(preAlteredValue, oldValue);
      } else {
        validationResults = updateValidator(value, oldValue);
      }
    } catch (err) {
      return validatorThrowOrReturnAndLog({
        errorToThrow: err,
        valueToReturn: oldValue,
        returnValueNullErrorGenerator: () => new Error('validator error, so revert to old value, but old value is null'),
        performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
      });
    }
    
    if (validationResults != null) {
      // catch possible error during validator func
      
      let adjustedNewValue = validationResults.adjustedNewValue;
      
      if (adjustedNewValue == null) {
        // validator requested revert
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator requested revert but value coercion not allowed'),
          valueToReturn: oldValue,
          returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
          performThrow: !allowValueCoercion,
        });
      } else {
        // validator provided new value
        
        if (typeof adjustedNewValue != 'string') {
          // validator value is invalid type
          
          return validatorThrowOrReturnAndLog({
            errorToThrow: new Error(`validator output not string: ${typeof adjustedNewValue}`),
            valueToReturn: oldValue,
            returnValueNullErrorGenerator: () => new Error(`validator output not string (${typeof adjustedNewValue}), so revert to old value, but old value is null`),
            performThrow: !revertWithoutErrorAndSuppressValidatorErrors,
          });
        }
        
        if (!multiline) {
          if (adjustedNewValue.includes('\n') || adjustedNewValue.includes('\r')) {
            // validator value fails a coercible constraint
            
            return validatorThrowOrReturnGenerator({
              errorToThrowGenerator: () => new Error(`text not multiline but validator output includes newlines: ${adjustedNewValue}`),
              valueToReturnGenerator: () => adjustedNewValue.replaceAll(/[\r\n]/, ''),
              returnValueNullErrorGenerator: () => new Error('validator requested revert but old value null'),
              performThrow: !allowValueCoercion,
            });
          }
        }
        
        // valid new value from validator
        
        return validatorThrowOrReturn({
          errorToThrowGenerator: () => new Error('validator output new value, but allowValueCoercion is false'),
          valueToReturn: adjustedNewValue,
          returnValueNullErrorGenerator: null,
          performThrow: !allowValueCoercion,
        });
      }
    } else {
      // fall through to ending if
    }
  } else {
    // fall through to ending if
  }
  
  if (preAlteredValue != null) {
    // ordinarily there would be a possible throw here if allowValueCoercion = false, but
    // preAlteredValue is only set if allowValueCoercion = true
    return preAlteredValue;
  } else {
    return null;
  }
}
