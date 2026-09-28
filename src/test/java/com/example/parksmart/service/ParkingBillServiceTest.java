package com.example.parksmart.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.CheckInOut;
import com.example.parksmart.entity.ParkingBill;
import com.example.parksmart.entity.ParkingSlot;
import com.example.parksmart.repository.BookingRepository;
import com.example.parksmart.repository.CheckInOutRepository;
import com.example.parksmart.repository.ParkingBillRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingBillServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CheckInOutRepository checkInOutRepository;

    @Mock
    private ParkingBillRepository parkingBillRepository;

    private ParkingBillService parkingBillService;

    @BeforeEach
    void setUp() {
        parkingBillService = new ParkingBillService(bookingRepository, checkInOutRepository, parkingBillRepository);
    }

    @Test
    void testCalculateBillWithOverstayMatchingPromptExample() {
        // Scenario from user prompt:
        // checkIn: 10:00, scheduledEnd: 12:00, checkOut: 14:30
        // parkingDurationMinutes: 270, parkingHours: 5, parkingAmount: 110.00
        // overstayMinutes: 150, overstayHours: 3, overstayPenalty: 150.00, totalAmount: 260.00
        Booking booking = new Booking();
        booking.setId(5L);
        booking.setCustomerName("John Doe");
        booking.setVehicleNumber("TN38AB1234");
        LocalDateTime scheduledStartTime = LocalDateTime.of(2026, 9, 28, 10, 0, 0);
        LocalDateTime scheduledEndTime = LocalDateTime.of(2026, 9, 28, 12, 0, 0);
        booking.setStartTime(scheduledStartTime);
        booking.setEndTime(scheduledEndTime);
        booking.setStatus("CONFIRMED");

        CheckInOut checkInOut = new CheckInOut();
        checkInOut.setId(1L);
        checkInOut.setBooking(booking);
        checkInOut.setCheckInTime(scheduledStartTime);
        checkInOut.setExpectedCheckOutTime(scheduledEndTime);
        LocalDateTime actualCheckOutTime = LocalDateTime.of(2026, 9, 28, 14, 30, 0);
        checkInOut.setActualCheckOutTime(actualCheckOutTime);
        checkInOut.setStatus("CHECKED_OUT");

        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(parkingBillRepository.findByBooking(booking)).thenReturn(Optional.empty());
        when(checkInOutRepository.findByBooking(booking)).thenReturn(Optional.of(checkInOut));
        when(parkingBillRepository.save(any(ParkingBill.class))).thenAnswer(invocation -> {
            ParkingBill saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        ParkingBill bill = parkingBillService.createBill(5L);

        assertNotNull(bill);
        assertEquals(5L, bill.getBookingId());
        assertEquals(270L, bill.getParkingDurationMinutes());
        assertEquals(5L, bill.getParkingHours());
        assertEquals(new BigDecimal("30.00"), bill.getFirstHourRate());
        assertEquals(new BigDecimal("20.00"), bill.getAdditionalHourRate());
        assertEquals(new BigDecimal("50.00"), bill.getOverstayRate());
        assertEquals(new BigDecimal("110.00"), bill.getParkingAmount());
        assertEquals(150L, bill.getOverstayMinutes());
        assertEquals(3L, bill.getOverstayHours());
        assertEquals(new BigDecimal("150.00"), bill.getOverstayPenalty());
        assertEquals(new BigDecimal("260.00"), bill.getTotalAmount());
        assertEquals(ParkingBill.STATUS_PENDING, bill.getPaymentStatus());
    }

    @Test
    void testCalculateBillWithinScheduledTimeNoOverstay() {
        // checkIn: 10:00, scheduledEnd: 12:00, checkOut: 11:30 (90 min => 2 hours)
        // parkingAmount: 30 + 1 * 20 = 50.00, overstay: 0
        Booking booking = new Booking();
        booking.setId(10L);
        LocalDateTime checkIn = LocalDateTime.of(2026, 9, 28, 10, 0, 0);
        LocalDateTime scheduledEnd = LocalDateTime.of(2026, 9, 28, 12, 0, 0);
        LocalDateTime checkOut = LocalDateTime.of(2026, 9, 28, 11, 30, 0);
        booking.setStartTime(checkIn);
        booking.setEndTime(scheduledEnd);
        booking.setStatus("CONFIRMED");

        CheckInOut checkInOut = new CheckInOut();
        checkInOut.setBooking(booking);
        checkInOut.setCheckInTime(checkIn);
        checkInOut.setExpectedCheckOutTime(scheduledEnd);
        checkInOut.setActualCheckOutTime(checkOut);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(booking));
        when(parkingBillRepository.findByBooking(booking)).thenReturn(Optional.empty());
        when(checkInOutRepository.findByBooking(booking)).thenReturn(Optional.of(checkInOut));
        when(parkingBillRepository.save(any(ParkingBill.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBill bill = parkingBillService.createBill(10L);

        assertEquals(90L, bill.getParkingDurationMinutes());
        assertEquals(2L, bill.getParkingHours());
        assertEquals(new BigDecimal("50.00"), bill.getParkingAmount());
        assertEquals(0L, bill.getOverstayMinutes());
        assertEquals(0L, bill.getOverstayHours());
        assertEquals(new BigDecimal("0.00"), bill.getOverstayPenalty());
        assertEquals(new BigDecimal("50.00"), bill.getTotalAmount());
    }

    @Test
    void testCalculateBillOneHourOrLess() {
        // Duration: 40 minutes => 1 hour => 30.00
        Booking booking = new Booking();
        booking.setId(11L);
        LocalDateTime checkIn = LocalDateTime.of(2026, 9, 28, 10, 0, 0);
        LocalDateTime scheduledEnd = LocalDateTime.of(2026, 9, 28, 11, 0, 0);
        LocalDateTime checkOut = LocalDateTime.of(2026, 9, 28, 10, 40, 0);
        booking.setStartTime(checkIn);
        booking.setEndTime(scheduledEnd);

        CheckInOut checkInOut = new CheckInOut();
        checkInOut.setBooking(booking);
        checkInOut.setCheckInTime(checkIn);
        checkInOut.setExpectedCheckOutTime(scheduledEnd);
        checkInOut.setActualCheckOutTime(checkOut);

        when(bookingRepository.findById(11L)).thenReturn(Optional.of(booking));
        when(parkingBillRepository.findByBooking(booking)).thenReturn(Optional.empty());
        when(checkInOutRepository.findByBooking(booking)).thenReturn(Optional.of(checkInOut));
        when(parkingBillRepository.save(any(ParkingBill.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBill bill = parkingBillService.createBill(11L);

        assertEquals(40L, bill.getParkingDurationMinutes());
        assertEquals(1L, bill.getParkingHours());
        assertEquals(new BigDecimal("30.00"), bill.getParkingAmount());
        assertEquals(new BigDecimal("0.00"), bill.getOverstayPenalty());
        assertEquals(new BigDecimal("30.00"), bill.getTotalAmount());
    }

    @Test
    void testDuplicateBillPreventionReturnsExistingBill() {
        Booking booking = new Booking();
        booking.setId(5L);

        ParkingBill existingBill = new ParkingBill();
        existingBill.setId(99L);
        existingBill.setBooking(booking);
        existingBill.setTotalAmount(new BigDecimal("260.00"));

        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(parkingBillRepository.findByBooking(booking)).thenReturn(Optional.of(existingBill));

        ParkingBill result = parkingBillService.createBill(5L);

        assertEquals(99L, result.getId());
        verify(parkingBillRepository, never()).save(any(ParkingBill.class));
    }

    @Test
    void testMarkAsPaid() {
        ParkingBill bill = new ParkingBill();
        bill.setId(1L);
        bill.setPaymentStatus(ParkingBill.STATUS_PENDING);

        when(parkingBillRepository.findById(1L)).thenReturn(Optional.of(bill));
        when(parkingBillRepository.save(any(ParkingBill.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBill paidBill = parkingBillService.markAsPaid(1L);

        assertEquals(ParkingBill.STATUS_PAID, paidBill.getPaymentStatus());
    }

    @Test
    void testCheckOutBeforeCheckInThrowsException() {
        Booking booking = new Booking();
        booking.setId(20L);
        booking.setEndTime(LocalDateTime.of(2026, 9, 28, 12, 0, 0));

        CheckInOut checkInOut = new CheckInOut();
        checkInOut.setBooking(booking);
        checkInOut.setCheckInTime(LocalDateTime.of(2026, 9, 28, 10, 0, 0));
        checkInOut.setActualCheckOutTime(LocalDateTime.of(2026, 9, 28, 9, 0, 0)); // Before check-in!

        when(bookingRepository.findById(20L)).thenReturn(Optional.of(booking));
        when(parkingBillRepository.findByBooking(booking)).thenReturn(Optional.empty());
        when(checkInOutRepository.findByBooking(booking)).thenReturn(Optional.of(checkInOut));

        assertThrows(IllegalArgumentException.class, () -> parkingBillService.createBill(20L));
    }
}
