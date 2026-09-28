package com.example.parksmart.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

@Entity
@Table(name = "parking_lot")
public class ParkingLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Parking lot name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Parking lot location is required")
    @Column(nullable = false)
    private String location;

    @NotNull(message = "Total slots is required")
    @PositiveOrZero(message = "Total slots cannot be negative")
    @Column(nullable = false)
    private Integer totalSlots;

    public ParkingLot() {
    }

    public ParkingLot(String name, String location, Integer totalSlots) {
        this.name = name;
        this.location = location;
        this.totalSlots = totalSlots;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Integer getTotalSlots() {
        return totalSlots;
    }

    public void setTotalSlots(Integer totalSlots) {
        this.totalSlots = totalSlots;
    }
}
