import { useMutation, useQuery } from '@tanstack/react-query';
import { Recipient, RecipientData } from '@tonkeeper/core/dist/entries/send';
import { Suggestion } from '@tonkeeper/core/dist/entries/suggestion';
import { AccountApi, AccountRepr, DNSApi } from '@tonkeeper/core/dist/tonApiV1';
import { debounce, seeIfValidAddress } from '@tonkeeper/core/dist/utils/common';
import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Address } from 'ton-core';
import { useAppContext } from '../../hooks/appContext';
import { useAppSdk } from '../../hooks/appSdk';
import { openIosKeyboard } from '../../hooks/ios';
import { useTranslation } from '../../hooks/translation';
import { QueryKey } from '../../libs/queryKey';
import { ButtonMock } from '../fields/BackButton';
import { Button } from '../fields/Button';
import { TextArea } from '../fields/Input';
import { InputWithScanner } from '../fields/InputWithScanner';
import { Gap } from '../Layout';
import {
  FullHeightBlock,
  NotificationCancelButton,
  NotificationTitleBlock,
} from '../Notification';
import { Body2, H3 } from '../Text';
import { ButtonBlock } from './common';
import { ShowAddress, useShowAddress } from './ShowAddress';
import { SuggestionList } from './SuggestionList';

const Warning = styled(Body2)`
  user-select: none;
  display: block;
  width: 100%;
  margin-top: -4px;
  color: ${(props) => props.theme.accentOrange};
`;

export const useGetToAccount = () => {
  const { tonApi } = useAppContext();
  return useMutation<AccountRepr, Error, Recipient>((recipient) => {
    const account =
      'dns' in recipient ? recipient.dns.address : recipient.address;
    return new AccountApi(tonApi).getAccountInfo({ account });
  });
};

const useToAccount = (isValid: boolean, recipient: Recipient) => {
  const { tonApi } = useAppContext();
  const account =
    'dns' in recipient ? recipient.dns.address : recipient.address;
  return useQuery<AccountRepr, Error>(
    [QueryKey.account, account],
    () => new AccountApi(tonApi).getAccountInfo({ account }),
    { enabled: isValid }
  );
};

const useDnsWallet = (value: string) => {
  const { tonApi } = useAppContext();

  const [name, setName] = useState('');

  const update = useMemo(() => {
    return debounce<[string]>((v) => {
      let value = v.trim().toLowerCase();
      if (!value.includes('.')) {
        value += '.ton';
      }
      setName(value);
    }, 400);
  }, [setName]);

  update(value);

  return useQuery(
    [QueryKey.dns, value, name],
    async () => {
      const result = await new DNSApi(tonApi).dnsResolve({ name });
      if (!result.wallet) {
        return null;
      }
      return result.wallet;
    },
    {
      enabled: name.length >= 4 && !seeIfValidAddress(name),
      retry: 0,
      keepPreviousData: false,
    }
  );
};

export const RecipientView: FC<{
  title: string;
  data?: RecipientData;
  onClose: () => void;
  setRecipient: (options: RecipientData) => void;
  keyboard?: 'decimal';
  onScan: (value: string) => void;
  isExternalLoading?: boolean;
}> = ({
  title,
  data,
  onClose,
  setRecipient,
  keyboard,
  onScan,
  isExternalLoading,
}) => {
  const sdk = useAppSdk();
  const [submitted, setSubmit] = useState(false);
  const { t } = useTranslation();
  const { standalone, ios } = useAppContext();
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const { mutateAsync: getAccountAsync, isLoading: isAccountLoading } =
    useGetToAccount();

  const [comment, setComment] = useState(data?.comment ?? '');
  const [recipient, setAddress] = useState<Recipient>(
    data?.address ?? {
      address: '',
    }
  );

  const { data: dnsWallet, isFetching: isDnsFetching } = useDnsWallet(
    recipient.address
  );

  useEffect(() => {
    if (dnsWallet) {
      setAddress((recipient) => ({
        address: recipient.address,
        dns: dnsWallet,
      }));
    }
    if (dnsWallet == null) {
      setAddress((recipient) => {
        if ('dns' in recipient) {
          return { address: recipient.address };
        }
        return recipient;
      });
    }
  }, [setAddress, dnsWallet]);

  const isValid = useMemo(() => {
    if ('dns' in recipient) {
      return true;
    }
    return seeIfValidAddress(recipient.address);
  }, [recipient]);

  const { data: toAccount, isFetching: isAccountFetching } = useToAccount(
    isValid,
    recipient
  );

  const isFetching = isAccountFetching || isAccountLoading || isExternalLoading;

  const isMemoValid = useMemo(() => {
    if (!toAccount) return true;
    if (toAccount.memoRequired) {
      return comment.length > 0;
    }
    return true;
  }, [toAccount, comment]);

  useEffect(() => {
    if (sdk.isIOs()) {
      return;
    }
    if (ref.current) {
      ref.current.focus();
    }
  }, [ref.current]);

  const formatted = useMemo(() => {
    if ('isFavorite' in recipient) {
      return Address.parse(recipient.address).toString();
    }
    return recipient.address;
  }, [recipient]);

  const showAddress = useShowAddress(ref, formatted, toAccount);

  const handleSubmit = () => {
    setSubmit(true);
    if (isValid && isMemoValid && toAccount) {
      if (ios && keyboard) openIosKeyboard(keyboard);
      setRecipient({ address: recipient, toAccount, comment, done: true });
    }
  };
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleSubmit();
  };

  const onSelect = async (item: Suggestion) => {
    setAddress(item);
    if (ios && keyboard) openIosKeyboard(keyboard);
    const toAccount = await getAccountAsync(item);
    if (toAccount.memoRequired) return;
    setRecipient({
      address: item,
      toAccount,
      comment,
      done: true,
    });
  };

  return (
    <FullHeightBlock onSubmit={onSubmit} standalone={standalone}>
      <NotificationTitleBlock>
        <ButtonMock />
        <H3>{title}</H3>
        <NotificationCancelButton handleClose={onClose} />
      </NotificationTitleBlock>
      <ShowAddress value={showAddress}>
        <InputWithScanner
          onSubmit={handleSubmit}
          ref={ref}
          value={formatted}
          onScan={onScan}
          onChange={(address) => setAddress({ address })}
          label={t('transaction_recipient_address')}
          isValid={!submitted || isValid}
          disabled={isExternalLoading}
        />
      </ShowAddress>

      <TextArea
        onSubmit={handleSubmit}
        value={comment}
        onChange={setComment}
        label={t('txActions_signRaw_comment')}
        isValid={!submitted || isMemoValid}
        disabled={isExternalLoading}
      />
      {toAccount && toAccount.memoRequired && (
        <Warning>
          {t('send_screen_steps_comfirm_comment_required_text')}
        </Warning>
      )}

      <SuggestionList onSelect={onSelect} disabled={isExternalLoading} />

      <Gap />

      <ButtonBlock>
        <Button
          fullWidth
          size="large"
          primary
          type="submit"
          loading={isFetching || isDnsFetching}
        >
          {t('continue')}
        </Button>
      </ButtonBlock>
    </FullHeightBlock>
  );
};
