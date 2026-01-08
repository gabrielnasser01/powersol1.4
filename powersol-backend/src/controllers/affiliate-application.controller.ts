import type { Request, Response } from 'express';
import { affiliateApplicationService } from '../services/affiliate-application.service.js';
import type { CreateAffiliateApplicationRequest } from '../types/affiliate-application.types.js';

export async function submitApplication(req: Request, res: Response) {
  try {
    const applicationData: CreateAffiliateApplicationRequest = req.body;

    if (!applicationData.wallet_address || !applicationData.full_name || !applicationData.email) {
      return res.status(400).json({
        error: 'Missing required fields: wallet_address, full_name, email',
      });
    }

    const application = await affiliateApplicationService.createApplication(applicationData);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already submitted')) {
      return res.status(409).json({
        error: 'You have already submitted an application',
      });
    }

    console.error('Error submitting application:', error);
    return res.status(500).json({
      error: 'Failed to submit application',
    });
  }
}

export async function getMyApplication(req: Request, res: Response) {
  try {
    const { wallet_address } = req.query;

    if (!wallet_address || typeof wallet_address !== 'string') {
      return res.status(400).json({
        error: 'wallet_address query parameter is required',
      });
    }

    const application = await affiliateApplicationService.getApplicationByWallet(wallet_address);

    if (!application) {
      return res.status(404).json({
        error: 'No application found for this wallet',
      });
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return res.status(500).json({
      error: 'Failed to fetch application',
    });
  }
}

export async function listApplications(req: Request, res: Response) {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const result = await affiliateApplicationService.getAllApplications(
      status as string,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    return res.status(200).json({
      success: true,
      data: result.applications,
      total: result.total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error listing applications:', error);
    return res.status(500).json({
      error: 'Failed to list applications',
    });
  }
}

export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: pending, approved, or rejected',
      });
    }

    const application = await affiliateApplicationService.updateApplicationStatus(id, {
      status,
      admin_notes,
    });

    return res.status(200).json({
      success: true,
      message: 'Application status updated',
      data: application,
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return res.status(500).json({
      error: 'Failed to update application',
    });
  }
}

export async function deleteApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await affiliateApplicationService.deleteApplication(id);

    return res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    return res.status(500).json({
      error: 'Failed to delete application',
    });
  }
}
