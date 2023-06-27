import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from 'next-i18next';

export default () => {
    const { t } = useTranslation('common');

    return (
        <div className="d-flex justify-content-center align-items-center">
            <span className={ "title-big text-secondary" }>{ t("ROUTES.404.TITLE") }</span>
        </div>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common']))
        }
    };
}