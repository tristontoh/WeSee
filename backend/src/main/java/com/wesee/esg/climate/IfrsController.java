package com.wesee.esg.climate;

import com.wesee.esg.climate.dto.BusinessSegmentResponse;
import com.wesee.esg.climate.dto.CreateSegmentRequest;
import com.wesee.esg.climate.dto.IfrsS1DisclosureResponse;
import com.wesee.esg.climate.dto.IfrsS2Response;
import com.wesee.esg.climate.dto.S1ItemResponse;
import com.wesee.esg.climate.dto.UpdateIfrsS1DisclosureRequest;
import com.wesee.esg.climate.dto.UpdateIfrsS2Request;
import com.wesee.esg.climate.dto.UpsertS1ItemRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ifrs")
@PreAuthorize("@planGate.check('ifrs-s1-s2')")
public class IfrsController {

    private final IfrsService ifrsService;

    public IfrsController(IfrsService ifrsService) {
        this.ifrsService = ifrsService;
    }

    @GetMapping("/s1/segments")
    public List<BusinessSegmentResponse> listSegments() {
        return ifrsService.listSegments();
    }

    @PostMapping("/s1/segments")
    public ResponseEntity<BusinessSegmentResponse> createSegment(@Valid @RequestBody CreateSegmentRequest request) {
        return ResponseEntity.ok(ifrsService.createSegment(request));
    }

    @PutMapping("/s1/segments/{segmentId}")
    public BusinessSegmentResponse renameSegment(@PathVariable UUID segmentId, @Valid @RequestBody CreateSegmentRequest request) {
        return ifrsService.renameSegment(segmentId, request);
    }

    @DeleteMapping("/s1/segments/{segmentId}")
    public ResponseEntity<Void> deleteSegment(@PathVariable UUID segmentId) {
        ifrsService.deleteSegment(segmentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/s1/segments/{segmentId}/items")
    public ResponseEntity<S1ItemResponse> addItem(@PathVariable UUID segmentId, @Valid @RequestBody UpsertS1ItemRequest request) {
        return ResponseEntity.ok(ifrsService.addItem(segmentId, request));
    }

    @PutMapping("/s1/items/{itemId}")
    public S1ItemResponse updateItem(@PathVariable UUID itemId, @Valid @RequestBody UpsertS1ItemRequest request) {
        return ifrsService.updateItem(itemId, request);
    }

    @DeleteMapping("/s1/items/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId) {
        ifrsService.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/s1/disclosure")
    public IfrsS1DisclosureResponse getS1Disclosure() {
        return ifrsService.getS1Disclosure();
    }

    @PutMapping("/s1/disclosure")
    public IfrsS1DisclosureResponse updateS1Disclosure(@Valid @RequestBody UpdateIfrsS1DisclosureRequest request) {
        return ifrsService.updateS1Disclosure(request);
    }

    @GetMapping("/s2")
    public IfrsS2Response getS2() {
        return ifrsService.getS2();
    }

    @PutMapping("/s2")
    public IfrsS2Response updateS2(@Valid @RequestBody UpdateIfrsS2Request request) {
        return ifrsService.updateS2(request);
    }
}
