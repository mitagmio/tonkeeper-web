import { useMutation } from '@tanstack/react-query';
import { accountChangePassword } from '@tonkeeper/core/dist/service/accountService';
import React, { FC, useCallback, useState } from 'react';
import styled from 'styled-components';
import { useAppSdk } from '../../hooks/appSdk';
import { useTranslation } from '../../hooks/translation';
import { Button } from '../fields/Button';
import { Input } from '../fields/Input';
import { Notification, NotificationBlock } from '../Notification';

const Block = styled.div`
  display: flex;
  text-align: center;
  gap: 1rem;
  flex-direction: column;
  width: 100%;
`;

const useUpdatePassword = () => {
  const sdk = useAppSdk();
  const { t } = useTranslation();
  return useMutation<
    string | undefined,
    Error,
    { old: string; password: string; confirm: string }
  >(async (options) => {
    const error = await accountChangePassword(sdk.storage, options);
    if (error === undefined) {
      sdk.uiEvents.emit('copy', {
        method: 'copy',
        id: Date.now(),
        params: t('PasswordChanged'),
      });
    }
    return error;
  });
};

const ChangePasswordContent: FC<{ handleClose: () => void }> = ({
  handleClose,
}) => {
  const { t } = useTranslation();

  const [error, setError] = useState<string | undefined>(undefined);

  const { mutateAsync, isLoading, reset } = useUpdatePassword();

  const [old, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const onUpdate: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    reset();

    const error = await mutateAsync({ old, password, confirm });
    if (error) {
      setError(error);
    } else {
      handleClose();
    }
  };

  return (
    <NotificationBlock onSubmit={onUpdate}>
      <Block>
        <Input
          type="password"
          label={t('Old_password')}
          value={old}
          onChange={(value) => {
            setError(undefined);
            setOldPassword(value);
          }}
          isValid={error !== 'invalid-old'}
          helpText={
            error === 'invalid-old' ? t('IncorrectCurrentPassword') : undefined
          }
        />
      </Block>

      <Block>
        <Input
          type="password"
          label={t('Password')}
          value={password}
          onChange={(value) => {
            setError(undefined);
            setPassword(value);
          }}
          isValid={error === undefined || error == 'invalid-old'}
          helpText={
            error === 'invalid-confirm'
              ? t('PasswordDoNotMatch')
              : t('MinPassword')
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
          isValid={error !== 'invalid-confirm'}
        />
      </Block>
      <Button
        size="large"
        fullWidth
        primary
        marginTop
        type="submit"
        loading={isLoading}
        disabled={isLoading || error != null}
      >
        {t('Change')}
      </Button>
    </NotificationBlock>
  );
};

export const ChangePasswordNotification: FC<{
  isOpen: boolean;
  handleClose: () => void;
}> = ({ isOpen, handleClose }) => {
  const { t } = useTranslation();

  const Content = useCallback((onClose: () => void) => {
    return <ChangePasswordContent handleClose={onClose} />;
  }, []);

  return (
    <Notification
      isOpen={isOpen}
      handleClose={handleClose}
      title={t('Change_password')}
      hideButton
    >
      {Content}
    </Notification>
  );
};
