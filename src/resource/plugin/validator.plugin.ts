import { registerDecorator, ValidationOptions, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator'
import dayjs from 'dayjs'

export function IsOnlyDate(validationOptions?: ValidationOptions) {
    return function(object: Record<string, any>, propertyName: string) {
        registerDecorator({
            name: 'IsOnlyDate',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [],
            options: {
                message: 'Please provide only date like 2020-12-08',
                ...validationOptions,
            },
            validator: {
                validate(value: any) {
                const regex = /^\d{4}(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/
                return typeof value === 'string' && regex.test(value) && dayjs(value).isValid()
                },
            },
        })
    }
}

/** Same as `@Optional()` decorator of class-validator, but adds a conditional layer on top of it */
export const IsOptionalIf: IsOptionalIf =
  (condition, options = {}) =>
  (target: object, propertyKey: string) => {
    const { allowNull = true, allowUndefined = true, ...validationOptions } = options
    ValidateIf((object: any, value: any): boolean => {
      // if condition was true, just disable the validation on the null & undefined fields
      const isOptional = Boolean(condition(object, value))
      const isNull = object[propertyKey] === null
      const isUndefined = object[propertyKey] === undefined
      let isDefined = !(isNull || isUndefined)
      if (!allowNull && allowUndefined) isDefined = !isUndefined
      if (!allowUndefined && allowNull) isDefined = !isNull

      const isRequired = isOptional && !isDefined ? false : true
      return isRequired
    }, validationOptions)(target, propertyKey)
  }

export interface OptionalIfOptions {
  allowNull?: boolean
  allowUndefined?: boolean
}

export type IsOptionalIf = <
  T extends Record<string, any> = any, // class instance
  Y extends keyof T = any, // propertyName
>(
  condition: (object: T, value: T[Y]) => boolean | void,
  validationOptions?: ValidationOptions & OptionalIfOptions
) => PropertyDecorator
