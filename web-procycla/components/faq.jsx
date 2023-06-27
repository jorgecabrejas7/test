import styles from "@/styles/faq.module.css";
import { useTranslation } from 'next-i18next';
import Icon from '@mui/material/Icon';
import { useEffect, useState } from "react";

const Faq = ({ faq }) => {
    const { t } = useTranslation('common');

    const [expandedQuestions, setExpandedQuestions] = useState(null);
    useEffect(() => {
        if(faq !== null && expandedQuestions === null) {
            setExpandedQuestions(makeExpandedQuestions());
        }
    }, [faq]);

    const makeExpandedQuestions = () => {
        let expandedQuestions = [];
        for (let index = 0; index < faq.length; index++) {
            expandedQuestions.push({ expanded: false });
        }
        return expandedQuestions;
    };

    const isQuestionExpanded = index => {
        if(expandedQuestions === null) return false;
        return expandedQuestions[index].expanded;
    }

    const expandOrCollapse = index => {
        if(expandedQuestions) {
            let expandedQuestionsCopy = JSON.parse(JSON.stringify(expandedQuestions));
            expandedQuestionsCopy[index].expanded = !expandedQuestionsCopy[index].expanded;
            setExpandedQuestions(expandedQuestionsCopy);
        }
    };

    return (
        <div className={ styles.card }>
            <span className={ "title-small mt-10 mb-20" }>{ t("FAQ.TITLE") }</span>
            {
                faq.map((question, index) => (
                    <div key={ index }>
                        <div className="d-flex align-items-center justify-content-between mt-10 mb-10 cursor-pointer" onClick={ () => expandOrCollapse(index) }>
                            <span className={ "text-medium primary-color fw-bold" }>{ question.QUESTION }</span>
                            { isQuestionExpanded(index) ? <Icon>expand_more</Icon> : <Icon>chevron_left</Icon> }
                        </div>
                        <div className={ styles.bar }/>
                        { isQuestionExpanded(index) ? <span className={ "text-medium text-secondary text-justify mt-10 mb-10" }>{ question.ANSWER }</span> : <></> }
                    </div>
                ))
            }
        </div>
    );
};

export default Faq;