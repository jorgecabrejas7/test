import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';

export default () => {
    const { t } = useTranslation('common');

    return (
        <div className="d-flex flex-row flex-column" style={{ maxWidth: '1300px' }}>
            <div className='d-flex flex-row justify-content-between align-items-center mb-30'>
                <span className="title-medium fw-bold primary-color text-uppercase">{ t('PAGES.COMPANY.TITLE') }</span>
            </div>
            <div className='d-flex flex-row mb-30'>
                <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                    <Image src="/img/Companyimagen2.jpg" alt="image2" fill style={{ objectFit: 'cover' }}/>
                </div>
                <div style={{ position: 'relative', width: '100%', height: '500px' }}>
                    <Image src="/img/Companyimagen1.jpg" alt="image1" fill style={{ objectFit: 'cover' }}/>
                </div>
            </div>
            <div className='d-flex flex-column mb-30'>
                <span className="title-medium">{ t('PAGES.COMPANY.ABOUT_US') }</span>
                <span className="text-medium">{ t('PAGES.COMPANY.ABOUT_US_TEXT') }</span>
            </div>
            <div id="team" className='d-flex flex-column mb-30'>
                <span className="title-medium">{ t('PAGES.COMPANY.ABOUT_MODSIM') }</span>
                <span className="text-medium mb-10">{ t('PAGES.COMPANY.ABOUT_MODSIM_TEXT') }</span>
                <span className="text-medium">{ t('PAGES.COMPANY.ABOUT_MODSIM_TEXT2') }</span>
            </div>
            <div className='d-flex flex-wrap m-50'>
                <div className='d-flex flex-column m-30'>
                    <div className='d-flex flex-row'>
                        <div className='m-10' style={{ position: 'relative', width: '150px', height: '150px' }}>
                            <Image src="/img/andresdonoso.png" alt="Andrés Donoso" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div className='m-10 d-flex align-items-end' style={{ position: 'relative', width: '150px', height: '150px', borderBottom: '6px solid #61C250' }}>
                            <span className='fw-bold text-medium text-uppercase mb-10'>
                                ANDRÉS<br/>
                                DONOSO<br/>
                                BRAVO
                            </span>
                        </div>
                    </div>
                    <ul>
                        <li className='text-medium'>{ t('PAGES.COMPANY.MARIA_FEATURE_1') }</li>
                        <li className='text-medium'>{ t('PAGES.COMPANY.MARIA_FEATURE_2') }</li>
                    </ul>
                </div>
                <div className='d-flex flex-column m-30'>
                    <div className='d-flex flex-row'>
                        <div className='m-10' style={{ position: 'relative', width: '150px', height: '150px' }}>
                            <Image src="/img/constanzasadino.png" alt="Constanza Sadino" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div className='m-10 d-flex align-items-end' style={{ position: 'relative', width: '150px', height: '150px', borderBottom: '6px solid #61C250' }}>
                            <span className='fw-bold text-medium text-uppercase mb-10'>
                                MARIA<br/>
                                CONSTANZA<br/>
                                SADINO R.
                            </span>
                        </div>
                    </div>
                    <ul>
                        <li className='text-medium'>{ t('PAGES.COMPANY.FERNANDO_FEATURE_1') }</li>
                        <li className='text-medium'>{ t('PAGES.COMPANY.FERNANDO_FEATURE_2') }</li>
                    </ul>
                </div>
                <div className='d-flex flex-column m-30'>
                    <div className='d-flex flex-row'>
                        <div className='m-10' style={{ position: 'relative', width: '150px', height: '150px' }}>
                            <Image src="/img/fernandozorilla.png" alt="Fernando Zorrilla" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div className='m-10 d-flex align-items-end' style={{ position: 'relative', width: '150px', height: '150px', borderBottom: '6px solid #61C250' }}>
                            <span className='fw-bold text-medium text-uppercase mb-10'>
                                FERNANDO<br/>
                                ZORRILLA
                            </span>
                        </div>
                    </div>
                    <ul>
                        <li className='text-medium'>{ t('PAGES.COMPANY.ANDRES_FEATURE_1') }</li>
                        <li className='text-medium'>{ t('PAGES.COMPANY.ANDRES_FEATURE_2') }</li>
                    </ul>
                </div>
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