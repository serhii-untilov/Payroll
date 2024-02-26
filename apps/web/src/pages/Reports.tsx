import { useTranslation } from 'react-i18next';
import PageLayout from '../components/layout/PageLayout';
import useLocale from '../hooks/useLocale';
import { useEffect } from 'react';

export default function Reports() {
    const { locale } = useLocale();
    const { t } = useTranslation();

    useEffect(() => {}, [locale]);

    return (
        <>
            <PageLayout title={t('Reports')}></PageLayout>
        </>
    );
}
