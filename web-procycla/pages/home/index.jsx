import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';
import Link from "next/link";
import Button from '@mui/material/Button';

export default () => {
    const { t } = useTranslation('common');

    return (
        <div className="d-flex flex-row flex-column" style={{ maxWidth: '1300px' }}>
            <div className='d-flex flex-row justify-content-between align-items-center mb-30'>
                <span className="title-medium fw-bold primary-color">{ t('PAGES.HOME.TITLE') }</span>
                <Image src="/img/modsim.png" alt="modsim" width="0" height="0" sizes="100vw" style={{ width: "100px", height: "auto" }}/>
            </div>
            <div className='mb-30' style={{ position: 'relative', width: '100%', height: '500px' }}>
                <Image src="/img/image0.jpg" alt="image0" fill style={{ objectFit: 'cover' }}/>
            </div>
            <div className='d-flex flex-column mb-30'>
                <span className="title-medium primary-color">{ t('PAGES.HOME.DESCRIPTION_TITLE') }</span>
                <span className="text-big">{ t('PAGES.HOME.DESCRIPTION') }</span>
            </div>
            <div className='border-box p-30 mb-30'>
                <Image src="/img/image1.jpg" alt="image1" width="0" height="0" sizes="100vw" style={{ width: '100%', height: 'auto' }}/>
            </div>
            <div className='d-flex flex-row justify-content-between align-items-center'>
                <Link href={ "/home/company" } className='w-100 mr-10'><Button variant="contained" type="button" size='large' color='success' className='w-100'>{ t('PAGES.HOME.COMPANY') }</Button></Link>
                <Link href={ "/home/company#team" } className='w-100'><Button variant="contained" type="button" size='large' color='success' className='w-100'>{ t('PAGES.HOME.MODSIM_TEAM') }</Button></Link>
            </div>
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