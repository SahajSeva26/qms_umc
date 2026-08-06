import { StatusCodes } from 'http-status-codes';
import { axiosInstance } from '../../config/axios/axios';
import ENV from '../../config/app.config';
import { logger } from '../../utils/logger';
import { throwAppError } from '../../utils/error';

interface CreateTicketPayload {
    summary: string;
    description: string;
    projectKey?: string; // falls back to ENV.Integrations.Jira.ProjectKey
    issueType?: string; // falls back to ENV.Integrations.Jira.IssueType
}

// Jira Cloud REST v3 requires `description` as an Atlassian Document Format (ADF)
// object, NOT a plain string — a plain string returns 400. Wrap the text in a
// minimal ADF doc.
const toAdf = (text: string) => ({
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const createTicket = async (payload: CreateTicketPayload) => {
    const { BaseUrl, Email, ApiToken, ProjectKey, IssueType } = ENV.Integrations.Jira;

    if (!BaseUrl || !Email || !ApiToken) {
        return throwAppError('Jira integration is not configured', StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const url = `${BaseUrl.replace(/\/+$/, '')}/rest/api/3/issue`;
    const auth = Buffer.from(`${Email}:${ApiToken}`).toString('base64');

    try {
        const response = await axiosInstance.post(
            url,
            {
                fields: {
                    project: { key: payload.projectKey || ProjectKey },
                    summary: payload.summary,
                    issuetype: { name: payload.issueType || IssueType },
                    description: toAdf(payload.description),
                },
            },
            {
                headers: { Authorization: `Basic ${auth}` },
            },
        );

        return response.data;
    } catch (error: any) {
        logger.error(
            { err: error, status: error?.response?.status, data: error?.response?.data },
            'Jira ticket creation failed',
        );
        return throwAppError('Failed to create Jira ticket', StatusCodes.BAD_GATEWAY);
    }
};

export const JiraProvider = { createTicket };
