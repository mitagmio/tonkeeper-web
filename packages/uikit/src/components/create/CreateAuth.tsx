import { useMutation } from '@tanstack/react-query';
import { AppKey } from '@tonkeeper/core/dist/Keys';
import {
  AuthNone,
  AuthPassword,
  AuthState,
} from '@tonkeeper/core/dist/entries/password';
import { MinPasswordLength } from '@tonkeeper/core/dist/service/accountService';
import React, { FC, useState } from 'react';
import styled from 'styled-components';
import { useAppSdk } from '../../hooks/appSdk';
import { useStorage } from '../../hooks/storage';
import { useTranslation } from '../../hooks/translation';
import { CenterContainer } from '../Layout';
import { H2 } from '../Text';
import { Button } from '../fields/Button';
import { Input } from '../fields/Input';

const Block = styled.form`
  display: flex;
  text-align: center;
  gap: 1rem;
  flex-direction: column;
`;

const useSetNoneAuthMutation = () => {
  const sdk = useAppSdk();
  return useMutation<void, Error, void>(async () => {
    const state: AuthNone = {
      kind: 'none',
    };
    await sdk.storage.set(AppKey.password, state);
  });
};

const SelectAuthType: FC<{
  onSelect: (value: AuthState['kind']) => void;
  isLoading: boolean;
}> = ({ onSelect, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Block>
      <Button
        size="large"
        fullWidth
        onClick={() => onSelect('none')}
        loading={isLoading}
      >
        {t('Without_authentication')}
      </Button>
      <Button
        size="large"
        fullWidth
        primary
        onClick={() => onSelect('password')}
        disabled={isLoading}
      >
        {t('Password')}
      </Button>
    </Block>
  );
};

const useCreatePassword = () => {
  const storage = useStorage();

  return useMutation<
    string | undefined,
    Error,
    { password: string; confirm: string }
  >(async ({ password, confirm }) => {
    if (password.length < MinPasswordLength) {
      return 'password';
    }
    if (password !== confirm) {
      return 'confirm';
    }

    const state: AuthPassword = {
      kind: 'password',
    };
    await storage.set(AppKey.password, state);
  });
};

const FillPassword: FC<{
  afterCreate: (password: string) => void;
  isLoading?: boolean;
}> = ({ afterCreate, isLoading }) => {
  const { t } = useTranslation();

  const { mutateAsync, isLoading: isCreating, reset } = useCreatePassword();

  const [error, setError] = useState<string | undefined>(undefined);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const onCreate: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    reset();
    const result = await mutateAsync({ password, confirm });
    if (result === undefined) {
      return afterCreate(password);
    } else {
      setError(result);
    }
  };

  return (
    <CenterContainer>
      <Block onSubmit={onCreate}>
        <H2>{t('Create_password')}</H2>
        <Input
          type="password"
          label={t('Password')}
          value={password}
          onChange={(value) => {
            setError(undefined);
            setPassword(value);
          }}
          isValid={error == null}
          helpText={
            error === 'confirm' ? t('PasswordDoNotMatch') : t('MinPassword')
          }
        />

        <Input
          type="password"
          label={t('ConfirmPassword')}
          value={confirm}
          onChange={(value) => {
            setError(undefined);
            setConfirm(value);
          }}
          isValid={error !== 'confirm'}
        />

        <Button
          size="large"
          fullWidth
          primary
          marginTop
          loading={isLoading || isCreating}
          disabled={isCreating || error != null}
          type="submit"
        >
          {t('continue')}
        </Button>
      </Block>
    </CenterContainer>
  );
};

export const CreateAuthState: FC<{
  afterCreate: (password?: string) => void;
  isLoading?: boolean;
}> = ({ afterCreate, isLoading }) => {
  const [authType, setAuthType] = useState<AuthState['kind'] | undefined>(
    'password'
  );

  const { mutateAsync: setNoneAuth, isLoading: isNoneLoading } =
    useSetNoneAuthMutation();

  const onSelect = async (authType: AuthState['kind']) => {
    if (authType === 'none') {
      await setNoneAuth();
      afterCreate();
    } else {
      setAuthType(authType);
    }
  };

  if (authType === undefined) {
    return <SelectAuthType onSelect={onSelect} isLoading={isNoneLoading} />;
  } else if (authType === 'password') {
    return <FillPassword afterCreate={afterCreate} isLoading={isLoading} />;
  } else {
    return <>TODO: WithAuthn case </>;
  }
};
