import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import FeedbackModal from '../FeedbackModal';
import { Sheet } from '@/components/ui/Sheet';
import { SheetPull } from '@/components/ui/SheetPull';
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, sendFeedback } from '@/lib/feedback';
import { submitFeedback } from '@/lib/feedbackStore';
import { confirm } from '@/lib/confirm';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'user-1', email: 'sky@example.com' } }) }));
jest.mock('@/lib/feedback', () => {
  const actual = jest.requireActual('@/lib/feedback');
  return { ...actual, sendFeedback: jest.fn() };
});
jest.mock('@/lib/feedbackStore', () => ({ submitFeedback: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn() }));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/lib/accessibility', () => {
  const actual = jest.requireActual('@/lib/accessibility');
  return {
    ...actual,
    useReducedMotion: jest.fn(() => true),
    useReduceTransparency: jest.fn(() => false),
    useFocusOnOpen: jest.fn(() => ({ current: null })),
  };
});

const mockSendFeedback = sendFeedback as jest.MockedFunction<typeof sendFeedback>;
const mockSubmitFeedback = submitFeedback as jest.MockedFunction<typeof submitFeedback>;
const mockConfirm = confirm as jest.MockedFunction<typeof confirm>;

function renderFeedback() {
  const onClose = jest.fn();
  return { ...render(<FeedbackModal visible onClose={onClose} />), onClose };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmitFeedback.mockResolvedValue({ status: 'inserted', row: null });
  mockSendFeedback.mockResolvedValue({ status: 'opened' });
});

describe('FeedbackModal — expanded presentation and categories', () => {
  it('uses the shared expanded, keyboard-aware sheet and preserves every category', () => {
    const screen = renderFeedback();
    expect(screen.UNSAFE_getByType(Sheet).props).toMatchObject({
      presentation: 'expanded',
      glass: true,
      padded: true,
      keyboardAvoiding: true,
    });
    for (const category of FEEDBACK_CATEGORIES) {
      expect(screen.getByLabelText(FEEDBACK_CATEGORY_LABELS[category])).toBeTruthy();
    }
  });

  it('does not prompt for an untouched form, including the prefilled email or category choice alone', () => {
    const screen = renderFeedback();
    fireEvent.press(screen.getByLabelText('Close feedback'));
    expect(screen.onClose).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();

    const categoryOnly = renderFeedback();
    fireEvent.press(categoryOnly.getByLabelText('Bug'));
    fireEvent.press(categoryOnly.getByLabelText('Cancel'));
    expect(categoryOnly.onClose).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});

describe('FeedbackModal — discard protection', () => {
  it('routes hardware/back and accessibility escape through the same dirty confirmation', async () => {
    mockConfirm.mockResolvedValue(false);
    const screen = renderFeedback();
    fireEvent.changeText(screen.getByLabelText('Feedback message'), 'A helpful detail');

    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith(
      'Discard feedback?',
      'Your unsent feedback will be lost.',
      'Discard',
      true,
    ));
    expect(screen.onClose).not.toHaveBeenCalled();

    screen.UNSAFE_getByType(SheetPull).props.onDismiss();
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(2));

    const containment = screen.getByTestId('feedbackModal-backdrop');
    containment.props.onAccessibilityEscape();
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(3));
  });

  it('keeps data on Cancel and restores the opening email plus an empty body on Discard', async () => {
    mockConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const screen = renderFeedback();
    const body = screen.getByLabelText('Feedback message');
    const email = screen.getByLabelText('Reply email');
    fireEvent.changeText(body, 'Keep me until discard');
    fireEvent.changeText(email, 'changed@example.com');

    fireEvent.press(screen.getByLabelText('Cancel'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(body.props.value).toBe('Keep me until discard');
    expect(email.props.value).toBe('changed@example.com');

    fireEvent.press(screen.getByLabelText('Cancel'));
    await waitFor(() => expect(screen.onClose).toHaveBeenCalledTimes(1));
    expect(body.props.value).toBe('');
    expect(email.props.value).toBe('sky@example.com');
  });

  it('treats a changed reply email as dirty even with no message body', async () => {
    mockConfirm.mockResolvedValue(false);
    const screen = renderFeedback();
    fireEvent.changeText(screen.getByLabelText('Reply email'), 'changed@example.com');
    fireEvent.press(screen.getByLabelText('Close feedback'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
  });
});

describe('FeedbackModal — send state', () => {
  it('blocks pull dismissal while sending and closes successfully without a discard prompt', async () => {
    let finishSend: ((value: { status: 'opened' }) => void) | undefined;
    mockSendFeedback.mockImplementationOnce(
      () => new Promise((resolve) => { finishSend = resolve; }),
    );
    const screen = renderFeedback();
    fireEvent.changeText(screen.getByLabelText('Feedback message'), 'Send this');
    fireEvent.press(screen.getByText('Send'));

    expect(screen.UNSAFE_getByType(SheetPull).props.enabled).toBe(false);
    expect(screen.getByLabelText('Close feedback').props.accessibilityState.disabled).toBe(true);

    finishSend?.({ status: 'opened' });
    await waitFor(() => expect(screen.onClose).toHaveBeenCalledTimes(1));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Feedback message').props.value).toBe('');
  });
});
