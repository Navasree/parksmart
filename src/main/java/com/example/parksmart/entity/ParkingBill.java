package com.example.parksmart.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "parking_bill")
public class ParkingBill {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PAID = "PAID";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    @JsonIgnore
    private Booking booking;

    @Transient
    private Long bookingId;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime checkInTime;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledEndTime;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime checkOutTime;

    @Column(nullable = false)
    private Long parkingDurationMinutes;

    @Column(nullable = false)
    private Long parkingHours;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal firstHourRate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal additionalHourRate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal overstayRate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal parkingAmount;

    @Column(nullable = false)
    private Long overstayMinutes;

    @Column(nullable = false)
    private Long overstayHours;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal overstayPenalty;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private String paymentStatus;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public ParkingBill() {
        this.paymentStatus = STATUS_PENDING;
    }

    public ParkingBill(Booking booking, LocalDateTime checkInTime, LocalDateTime scheduledEndTime,
                       LocalDateTime checkOutTime, Long parkingDurationMinutes, Long parkingHours,
                       BigDecimal firstHourRate, BigDecimal additionalHourRate, BigDecimal overstayRate,
                       BigDecimal parkingAmount, Long overstayMinutes, Long overstayHours,
                       BigDecimal overstayPenalty, BigDecimal totalAmount, String paymentStatus) {
        this.booking = booking;
        if (booking != null) {
            this.bookingId = booking.getId();
        }
        this.checkInTime = checkInTime;
        this.scheduledEndTime = scheduledEndTime;
        this.checkOutTime = checkOutTime;
        this.parkingDurationMinutes = parkingDurationMinutes;
        this.parkingHours = parkingHours;
        this.firstHourRate = firstHourRate;
        this.additionalHourRate = additionalHourRate;
        this.overstayRate = overstayRate;
        this.parkingAmount = parkingAmount;
        this.overstayMinutes = overstayMinutes;
        this.overstayHours = overstayHours;
        this.overstayPenalty = overstayPenalty;
        this.totalAmount = totalAmount;
        this.paymentStatus = paymentStatus != null ? paymentStatus : STATUS_PENDING;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.paymentStatus == null) {
            this.paymentStatus = STATUS_PENDING;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
        if (booking != null) {
            this.bookingId = booking.getId();
        }
    }

    @JsonProperty("bookingId")
    public Long getBookingId() {
        if (booking != null) {
            try {
                return booking.getId();
            } catch (Exception ignored) {
            }
        }
        return bookingId;
    }

    @JsonProperty("bookingId")
    public void setBookingId(Long bookingId) {
        this.bookingId = bookingId;
    }

    public LocalDateTime getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(LocalDateTime checkInTime) {
        this.checkInTime = checkInTime;
    }

    public LocalDateTime getScheduledEndTime() {
        return scheduledEndTime;
    }

    public void setScheduledEndTime(LocalDateTime scheduledEndTime) {
        this.scheduledEndTime = scheduledEndTime;
    }

    public LocalDateTime getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(LocalDateTime checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public Long getParkingDurationMinutes() {
        return parkingDurationMinutes;
    }

    public void setParkingDurationMinutes(Long parkingDurationMinutes) {
        this.parkingDurationMinutes = parkingDurationMinutes;
    }

    public Long getParkingHours() {
        return parkingHours;
    }

    public void setParkingHours(Long parkingHours) {
        this.parkingHours = parkingHours;
    }

    public BigDecimal getFirstHourRate() {
        return firstHourRate;
    }

    public void setFirstHourRate(BigDecimal firstHourRate) {
        this.firstHourRate = firstHourRate;
    }

    public BigDecimal getAdditionalHourRate() {
        return additionalHourRate;
    }

    public void setAdditionalHourRate(BigDecimal additionalHourRate) {
        this.additionalHourRate = additionalHourRate;
    }

    public BigDecimal getOverstayRate() {
        return overstayRate;
    }

    public void setOverstayRate(BigDecimal overstayRate) {
        this.overstayRate = overstayRate;
    }

    public BigDecimal getParkingAmount() {
        return parkingAmount;
    }

    public void setParkingAmount(BigDecimal parkingAmount) {
        this.parkingAmount = parkingAmount;
    }

    public Long getOverstayMinutes() {
        return overstayMinutes;
    }

    public void setOverstayMinutes(Long overstayMinutes) {
        this.overstayMinutes = overstayMinutes;
    }

    public Long getOverstayHours() {
        return overstayHours;
    }

    public void setOverstayHours(Long overstayHours) {
        this.overstayHours = overstayHours;
    }

    public BigDecimal getOverstayPenalty() {
        return overstayPenalty;
    }

    public void setOverstayPenalty(BigDecimal overstayPenalty) {
        this.overstayPenalty = overstayPenalty;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
