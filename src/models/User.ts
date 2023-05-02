import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { HydratedDocument, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CustomAttributes } from './types/types';
import { Role } from '../global/types/roles';
import { Properties } from '../global/types/types';

@Schema({ _id: false })
export class C8yCredentials {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  tenantID: string;

  @Prop({ required: true })
  baseAddress: string;
}

const C8yCredentialsSchema = SchemaFactory.createForClass(C8yCredentials);

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
})
export class User extends Base {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: () => [Role], default: [Role.User] })
  roles: Role[];

  @Prop({ type: C8yCredentialsSchema })
  c8yCredentials?: C8yCredentials;

  @Prop({
    type: Object,
    default: {},
    validate: {
      validator: function (value) {
        return typeof value === 'object';
      },
      message: 'CustomAttributes have to be of type object!',
    },
  })
  customAttributes: CustomAttributes;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.methods.isPasswordMatch = async function (
  passwordToCompare: string,
): Promise<boolean> {
  const user = this as UserDocument;
  return await bcrypt.compare(passwordToCompare, user.password);
};

export interface PasswordCheck {
  isPasswordMatch: (passwordToCompare: string) => Promise<boolean>;
}

export type UserDocument = Omit<HydratedDocument<User>, 'password'> & {
  password?: string;
};
export type UserModel = Model<User>;

export type C8yCredentialsType = Properties<C8yCredentials>;
export type UserType = Properties<User>;
