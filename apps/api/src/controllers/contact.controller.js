const { successResponse, errorResponse } = require('../utils/response.util.js');
const { sendContactFormEmail } = require('../utils/email.util.js');

/**
 * Submit contact form
 * Receives form data from the frontend and sends an email notification to the support team
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.subject - Contact subject
 * @param {string} req.body.message - Contact message
 * @param {Object} res - Express response object
 * @returns {Object} Success or error response
 */
const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Send email notification to support team
    const emailResult = await sendContactFormEmail({
      name,
      email,
      subject,
      message,
    });

    // Return success even if email sending fails (don't expose email system failures to users)
    if (!emailResult.success) {
      console.error('Contact form email sending failed:', emailResult.error);
    }

    return successResponse(
      res,
      {
        message: 'Contact form submitted successfully. We will get back to you soon.',
      },
      'Contact form submitted successfully',
      200
    );
  } catch (error) {
    console.error('Contact form submission error:', error);
    return errorResponse(
      res,
      'Failed to submit contact form. Please try again later.',
      500
    );
  }
};

module.exports = {
  submitContactForm,
};
